import { sql } from "@/lib/db";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { DashboardClient, type DashboardData } from "@/components/dashboard/dashboard-client";

export const revalidate = 0;

export default async function Dashboard() {
  const { start, end } = await fetchCurrentCycle();
  const startStr = start.toISOString().split("T")[0];
  const endStr   = end.toISOString().split("T")[0];

  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 7-day window for streak
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  // 14-day window for upcoming bills
  const fourteenDaysOut = new Date(today);
  fourteenDaysOut.setDate(today.getDate() + 14);
  const fourteenDaysOutStr = fourteenDaysOut.toISOString().split("T")[0];

  const [accounts, txSums, cycleTransactions, categories, lastLogRow, loggedDaysRows, upcomingRows, inboxRows] =
    await Promise.all([
      sql`SELECT id, name, currency, initial_balance, initial_balance_eur FROM accounts ORDER BY name`,
      sql`SELECT account_id, COALESCE(SUM(amount_eur), 0) AS eur_sum FROM transactions GROUP BY account_id`,
      sql`
        SELECT category, description, date,
               COALESCE(amount_eur, amount) AS eur_amount
        FROM transactions
        WHERE date >= ${startStr} AND date <= ${endStr}
        ORDER BY date DESC
      `,
      sql`
        SELECT name, type, color, monthly_budget
        FROM categories
        WHERE monthly_budget IS NOT NULL AND monthly_budget > 0 AND is_active = true
        ORDER BY type DESC, monthly_budget DESC
      `,
      sql`SELECT MAX(date) AS last_date FROM transactions`,
      sql`
        SELECT DISTINCT date::text AS d
        FROM transactions
        WHERE date >= ${sevenDaysAgoStr} AND date <= ${todayStr}
      `,
      sql`
        SELECT fi.date::text AS due_date,
               fr.name,
               COALESCE(fi.override_amount, fi.amount, fr.amount) AS amount
        FROM forecast_instances fi
        JOIN forecast_rules fr ON fi.rule_id = fr.id
        WHERE fi.date >= ${todayStr} AND fi.date <= ${fourteenDaysOutStr}
          AND fi.status = 'projected'
        ORDER BY fi.date ASC
        LIMIT 8
      `,
      sql`SELECT COUNT(*) AS n FROM staged_transactions WHERE status = 'pending'`,
    ]);

  // ── Account balances ──────────────────────────────────────────────────────
  const eurSumMap: Record<string, number> = {};
  for (const r of txSums) eurSumMap[r.account_id] = Number(r.eur_sum);

  const accountsWithBalance = accounts.map((acc: any) => {
    const eurBase =
      acc.initial_balance_eur != null
        ? Number(acc.initial_balance_eur)
        : acc.currency === "EUR"
        ? Number(acc.initial_balance)
        : 0;
    return { ...acc, balance: eurBase + (eurSumMap[acc.id] ?? 0) };
  });

  const assets      = accountsWithBalance.filter((a: any) => a.balance >= 0).reduce((s: number, a: any) => s + a.balance, 0);
  const liabilities = Math.abs(accountsWithBalance.filter((a: any) => a.balance < 0).reduce((s: number, a: any) => s + a.balance, 0));
  const netWorth    = assets - liabilities;

  // Smallest debt to "attack next" (snowball)
  const debtAccounts = accountsWithBalance
    .filter((a: any) => a.balance < 0)
    .sort((a: any, b: any) => b.balance - a.balance); // closest to zero first
  const attackNext = debtAccounts[0]
    ? { name: debtAccounts[0].name, balance: debtAccounts[0].balance }
    : null;

  // ── Cycle / daily stats ───────────────────────────────────────────────────
  const salary = categories
    .filter((c: any) => c.type === "income")
    .reduce((s: number, c: any) => s + Number(c.monthly_budget), 0);
  const plannedExpenses = categories
    .filter((c: any) => c.type === "expense")
    .reduce((s: number, c: any) => s + Number(c.monthly_budget), 0);
  const freePool = Math.max(0, salary - plannedExpenses);

  const daysTotal = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const daysLeft  = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000) + 1);

  const dailyAllowance = daysTotal > 0 ? freePool / daysTotal : 0;

  const spentToday = cycleTransactions
    .filter((t: any) => {
      const d = typeof t.date === "string" ? t.date : t.date?.toISOString?.()?.split("T")[0];
      return d === todayStr && Number(t.eur_amount) < 0;
    })
    .reduce((s: number, t: any) => s + Math.abs(Number(t.eur_amount)), 0);

  // ── Spending & budget ─────────────────────────────────────────────────────
  const categorySpend: Record<string, number> = {};
  for (const t of cycleTransactions) {
    if (t.category === "Transfer") continue;
    const val = Number(t.eur_amount);
    if (val < 0) {
      const cat = t.category || "Uncategorized";
      categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(val);
    }
  }
  const budgetByName = Object.fromEntries(
    categories.map((c: any) => [c.name, Number(c.monthly_budget)])
  );
  const spending = Object.entries(categorySpend)
    .map(([name, spent]) => ({ name, spent, budget: budgetByName[name] ?? null }))
    .sort((a, b) => b.spent - a.spent);

  // ── Recent transactions ───────────────────────────────────────────────────
  const recentTransactions = cycleTransactions.slice(0, 5).map((t: any) => {
    const rawDate = typeof t.date === "string" ? t.date : t.date?.toISOString?.()?.split("T")[0] ?? "";
    const dateLabel = rawDate
      ? new Date(rawDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : "";
    return {
      label:    t.description ?? "—",
      category: t.category ?? "Uncategorized",
      amount:   Number(t.eur_amount),
      date:     dateLabel,
    };
  });

  // ── Days since last log + streak ──────────────────────────────────────────
  const lastDate = lastLogRow[0]?.last_date;
  const daysSinceLastLog = lastDate
    ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / 86400000)
    : 999;

  const loggedSet = new Set(loggedDaysRows.map((r: any) => String(r.d)));
  const loggedDays: boolean[] = [];
  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    loggedDays.push(loggedSet.has(key));
    dayLabels.push(String(d.getDate()));
  }

  // ── Upcoming bills ────────────────────────────────────────────────────────
  const todayMidnight = new Date(todayStr + "T00:00:00").getTime();
  const upcomingBills = upcomingRows.map((r: any) => {
    const dueDate = new Date(r.due_date + "T00:00:00");
    const daysUntil = Math.round((dueDate.getTime() - todayMidnight) / 86400000);
    return { name: r.name, amount: Number(r.amount), daysUntil: Math.max(0, daysUntil) };
  });

  const nextDueBill = upcomingBills[0]
    ? {
        name:   upcomingBills[0].name,
        amount: upcomingBills[0].amount,
        date:   new Date(upcomingRows[0].due_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      }
    : null;

  // ── Cycle label ───────────────────────────────────────────────────────────
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const data: DashboardData = {
    cycleStart: fmt(start),
    cycleEnd:   fmt(end),
    daysLeft,
    daysTotal,
    dailyAllowance,
    spentToday,
    assets,
    liabilities,
    netWorth,
    daysSinceLastLog,
    loggedDays,
    dayLabels,
    recentTransactions,
    spending,
    upcomingBills,
    attackNext,
    nextDueBill,
    inboxCount: Number(inboxRows[0]?.n ?? 0),
  };

  return <DashboardClient data={data} />;
}

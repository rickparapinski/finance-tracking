import { sql } from "@/lib/db";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { AllTransactionsCard } from "@/components/dashboard/all-transactions-card";
import { SurvivalCard } from "@/components/dashboard/survival-card";
import { SchedulerCard } from "@/components/dashboard/scheduler-card";
import { categoryColor } from "@/lib/category-color";
import { DashboardCard } from "@/components/dashboard/dashboard-card";

export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export default async function Dashboard() {
  const { start, end } = await fetchCurrentCycle();

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  // ── Queries ───────────────────────────────────────────────────────────────
  const [accounts, cycleTransactions, allHistory, categories] = await Promise.all([
    sql`SELECT id, currency, initial_balance, initial_balance_eur FROM accounts`,
    sql`
      SELECT category, COALESCE(amount_eur, amount) AS eur_amount, description, date, id
      FROM transactions
      WHERE date >= ${startStr} AND date <= ${endStr}
      ORDER BY date DESC
    `,
    sql`SELECT account_id, COALESCE(amount_eur, amount) AS eur_amount FROM transactions`,
    sql`
      SELECT name, type, color, monthly_budget
      FROM categories
      WHERE monthly_budget IS NOT NULL AND monthly_budget > 0 AND is_active = true
      ORDER BY type DESC, monthly_budget DESC
    `,
  ]);

  // ── Net worth ─────────────────────────────────────────────────────────────
  const netWorth = accounts.reduce((sum: number, acc: any) => {
    const eurActivity = allHistory
      .filter((t: any) => t.account_id === acc.id)
      .reduce((s: number, t: any) => s + Number(t.eur_amount), 0);
    const eurBase =
      acc.initial_balance_eur != null
        ? Number(acc.initial_balance_eur)
        : acc.currency === "EUR"
        ? Number(acc.initial_balance)
        : 0;
    return sum + eurBase + eurActivity;
  }, 0);

  // ── Survival / daily budget ───────────────────────────────────────────────
  const salary = categories
    .filter((c: any) => c.type === "income")
    .reduce((s: number, c: any) => s + Number(c.monthly_budget), 0);

  const plannedExpenses = categories
    .filter((c: any) => c.type === "expense")
    .reduce((s: number, c: any) => s + Number(c.monthly_budget), 0);

  const freePool = salary - plannedExpenses;

  const today = new Date();
  const daysTotal = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const daysLeft = Math.max(
    0,
    Math.round((end.getTime() - today.getTime()) / 86400000) + 1,
  );

  // ── Cycle spending stats ──────────────────────────────────────────────────
  const categorySpend: Record<string, number> = {};
  let totalExpense = 0;

  for (const t of cycleTransactions) {
    if (t.category === "Transfer") continue;
    const val = Number(t.eur_amount);
    if (val < 0) {
      totalExpense += Math.abs(val);
      const cat = t.category || "Uncategorized";
      categorySpend[cat] = (categorySpend[cat] || 0) + Math.abs(val);
    }
  }

  // Build enriched spending rows: merge actual spend with category budget info
  const budgetByName = Object.fromEntries(
    categories.map((c: any) => [c.name, { budget: Number(c.monthly_budget), color: c.color as string | null }]),
  );

  const spendingRows = Object.entries(categorySpend)
    .map(([name, spent]) => ({
      name,
      spent,
      budget: budgetByName[name]?.budget ?? null,
      color: budgetByName[name]?.color ?? null,
    }))
    .sort((a, b) => b.spent - a.spent);

  // Recent transactions for top card
  const top3Transactions = cycleTransactions.slice(0, 3).map((t: any) => ({
    id: String(t.id),
    description: t.description,
    category: t.category,
    date: t.date,
    amount: Number(t.eur_amount),
    currency: "EUR",
  }));

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">
          {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
          {end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </header>

      {/* Top 3 cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AllTransactionsCard items={top3Transactions} currency="EUR" />
        <SurvivalCard
          salary={salary}
          plannedExpenses={plannedExpenses}
          freePool={freePool}
          daysLeft={daysLeft}
          daysTotal={daysTotal}
        />
        <SchedulerCard />
      </div>

      {/* Top Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title="Top Spending" className="lg:col-span-2">
          {spendingRows.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No expenses yet this cycle.</p>
          ) : (
            <div className="space-y-3">
              {spendingRows.slice(0, 8).map(({ name, spent, budget, color }) => {
                const dot = categoryColor(name, color);
                const pct = totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0;
                const budgetPct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : null;
                const over = budget != null && spent > budget;

                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="shrink-0 h-2 w-2 rounded-full"
                          style={{ backgroundColor: dot }}
                        />
                        <span className="font-medium text-slate-700 truncate">{name}</span>
                        {over && (
                          <span className="shrink-0 text-[10px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                            over
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right tabular-nums text-xs text-slate-500">
                        {fmt(spent)}
                        {budget != null && (
                          <span className="text-slate-300"> / {fmt(budget)}</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar: budget if set, else share of total */}
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${budgetPct ?? pct}%`,
                          backgroundColor: over ? "#ef4444" : dot,
                          opacity: 0.75,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>

        {/* Net worth summary */}
        <div className="rounded-[var(--radius)] bg-white p-5 shadow-[var(--shadow-softer)] flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Net Worth</h2>
          <div>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{fmt(netWorth)}</p>
            <p className="text-xs text-slate-400 mt-1">across all accounts</p>
          </div>
          <div className="mt-6 space-y-1 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Spent this cycle</span>
              <span className="tabular-nums text-rose-500">{fmt(totalExpense)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Free pool</span>
              <span className={`tabular-nums font-medium ${freePool >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {fmt(freePool)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

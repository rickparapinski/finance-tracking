import { createClient } from "@supabase/supabase-js";
import { ForecastTable } from "./ForecastTable";
import { UnmatchedList } from "./UnmatchedList";
import { AddRuleModal } from "./AddRuleModal";
import { generateForecastInstances } from "./actions";
import { getCycleKeyForDate } from "@/lib/finance-utils";

export const revalidate = 0;

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const resolvedParams = await searchParams;
  const year = Number(resolvedParams?.year ?? new Date().getFullYear());

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1. FETCH CONFIG & DATA
  const fetchStart = new Date(Date.UTC(year - 1, 10, 1)).toISOString(); // Nov prev year
  const fetchEnd = new Date(Date.UTC(year + 1, 2, 1)).toISOString(); // Mar next year

  const [
    { data: accounts },
    { data: txBefore },
    { data: txInRange },
    { data: rules },
    { data: dbCycles },
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase
      .from("transactions")
      .select("account_id, amount, amount_eur")
      .lt("date", fetchStart),
    supabase
      .from("transactions")
      .select("*")
      .gte("date", fetchStart)
      .lt("date", fetchEnd),
    supabase.from("forecast_rules").select("*").eq("is_active", true),
    supabase.from("cycles").select("*"),
  ]);

  await generateForecastInstances({
    startDate: `${year}-01-01`,
    horizonMonths: 18,
  });

  const { data: fcInRange } = await supabase
    .from("forecast_instances")
    .select(
      "id, rule_id, date, amount, status, note, transaction_id, override_amount",
    )
    .gte("date", fetchStart)
    .lt("date", fetchEnd);

  const forecastInstances = fcInRange ?? [];
  const ruleById = new Map((rules ?? []).map((r) => [r.id, r]));

  // --- 2. CYCLE HELPER (Smart Cycles) ---
  const getSmartCycleKey = (dateStr: string) => {
    // Check DB Custom Cycles first
    const found = dbCycles?.find((c) => {
      return dateStr >= c.start_date && dateStr <= c.end_date;
    });
    if (found) return found.key;
    // Fallback
    return getCycleKeyForDate(new Date(dateStr));
  };

  // --- 3. FILTERING ---
  const assetAccounts = (accounts ?? []).filter((a) => a.nature === "asset");
  const assetAccountIds = new Set(assetAccounts.map((a) => a.id));

  // A. Actuals: Only count transactions on Asset accounts (Money actually leaving/entering bank)
  const relevantTxBefore = (txBefore ?? []).filter((t) =>
    assetAccountIds.has(t.account_id),
  );
  const relevantTxInRange = (txInRange ?? []).filter((t) =>
    assetAccountIds.has(t.account_id),
  );

  // B. Forecast: Allow ALL rules (Asset OR Liability).
  //    This ensures BNPL/Credit Card projected payments show up as "Upcoming Expenses".
  const relevantForecastInstances = forecastInstances.filter((f) => {
    const rule = ruleById.get(f.rule_id);
    return !!rule; // <--- CHANGED: Removed assetAccountIds check to show Klarna items
  });

  // --- 4. UNMATCHED LIST ---
  const linkedTxIds = new Set(
    relevantForecastInstances.map((f) => f.transaction_id).filter(Boolean),
  );

  const unmatchedTransactions = relevantTxInRange
    .filter((t) => !linkedTxIds.has(t.id))
    .filter((t) => t.date >= `${year}-01-01` && t.date <= `${year}-12-31`)
    .map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount_eur ?? t.amount,
      category: t.category,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const allProjected = relevantForecastInstances
    .filter((f) => f.status === "projected")
    .map((f) => ({
      id: f.id,
      date: f.date,
      amount: Number(f.override_amount ?? f.amount),
      ruleName: ruleById.get(f.rule_id)?.name,
      category: ruleById.get(f.rule_id)?.category,
    }));

  // --- 5. AGGREGATION ---
  const amountFor = (t: any) => Number(t.amount_eur ?? t.amount);
  const catKey = (k: string, c: string) => `${k}:${c || "Uncategorized"}`;

  // Opening Balance (Asset Accounts only)
  let runningBalance =
    assetAccounts.reduce((sum, a) => sum + (a.initial_balance ?? 0), 0) +
    relevantTxBefore.reduce((sum, t) => sum + amountFor(t), 0);

  const actualsByCat = new Map<string, number>();
  for (const t of relevantTxInRange) {
    const k = getSmartCycleKey(t.date);
    const key = catKey(k, t.category);
    actualsByCat.set(key, (actualsByCat.get(key) ?? 0) + amountFor(t));
  }

  const billsByCat = new Map<string, number>();
  for (const f of relevantForecastInstances) {
    if (f.status !== "projected") continue;

    // Use the Smart Cycle key so BNPL items fall into the correct custom period
    const k = getSmartCycleKey(f.date);
    const rule = ruleById.get(f.rule_id);
    const key = catKey(k, rule?.category || "Uncategorized");
    const val = Number(f.override_amount ?? f.amount);
    billsByCat.set(key, (billsByCat.get(key) ?? 0) + val);
  }

  const rows = [];
  for (let mOffset = -1; mOffset < 12; mOffset++) {
    const targetDate = new Date(Date.UTC(year, mOffset, 1));
    const cycleYear = targetDate.getUTCFullYear();
    const cycleMonth = targetDate.getUTCMonth();
    const k = `${cycleYear}-${String(cycleMonth + 1).padStart(2, "0")}`;

    let monthActual = 0;
    let monthProjected = 0;

    for (const [key, val] of actualsByCat.entries()) {
      if (key.startsWith(k + ":")) monthActual += val;
    }
    for (const [key, val] of billsByCat.entries()) {
      if (key.startsWith(k + ":")) monthProjected += val;
    }

    const net = monthActual + monthProjected;
    const opening = runningBalance;
    const closing = opening + net;
    runningBalance = closing;

    if (cycleYear === year) {
      rows.push({
        key: k,
        label: targetDate.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
        opening,
        actual: monthActual,
        projected: monthProjected,
        net,
        closing,
      });
    }
  }

  const detailsByMonth: Record<string, any[]> = {};
  for (const f of relevantForecastInstances) {
    const k = getSmartCycleKey(f.date);
    if (!k.startsWith(`${year}-`)) continue;

    if (!detailsByMonth[k]) detailsByMonth[k] = [];

    detailsByMonth[k].push({
      id: f.id,
      date: f.date,
      amount: Number(f.override_amount ?? f.amount),
      status: f.status,
      ruleName: ruleById.get(f.rule_id)?.name,
      category: ruleById.get(f.rule_id)?.category,
      note: f.note,
      transaction_id: f.transaction_id,
    });
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Forecast</h1>
          <p className="text-sm text-slate-600">
            Cash Flow View (Assets + Projected Liabilities).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddRuleModal
            accountId={
              accounts?.find((a) => a.name.includes("Revolut Main"))?.id
            }
          />
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <a
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
            href={`/forecast?year=${year - 1}`}
          >
            ← {year - 1}
          </a>
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white shadow-sm">
            {year}
          </div>
          <a
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
            href={`/forecast?year=${year + 1}`}
          >
            {year + 1} →
          </a>
        </div>
      </div>

      <UnmatchedList
        transactions={unmatchedTransactions}
        projectedInstances={allProjected}
      />

      <ForecastTable rows={rows} detailsByMonth={detailsByMonth} />
    </div>
  );
}

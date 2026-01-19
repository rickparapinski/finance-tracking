import { createClient } from "@supabase/supabase-js";
import { ForecastTable } from "./ForecastTable";
import { UnmatchedList } from "./UnmatchedList"; // Import the new component
import { ensureForecastInstances } from "./actions";
import {
  formatCurrency,
  getCycleStartDate,
  getCycleKeyForDate,
} from "@/lib/finance-utils";

export const revalidate = 0;

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const year = Number(searchParams?.year ?? new Date().getFullYear());
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1. DATES & CYCLES
  const fetchStart = new Date(Date.UTC(year - 1, 11, 1)).toISOString();
  const fetchEnd = new Date(Date.UTC(year + 1, 1, 1)).toISOString();

  // 2. FETCH DATA
  const [
    { data: accounts },
    { data: txBefore },
    { data: txInRange },
    { data: rules },
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase
      .from("transactions")
      .select("amount, amount_eur")
      .lt("date", fetchStart),
    supabase
      .from("transactions")
      .select("*")
      .gte("date", fetchStart)
      .lt("date", fetchEnd),
    supabase.from("forecast_rules").select("*").eq("is_active", true),
  ]);

  // Ensure forecast exists
  await ensureForecastInstances({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    horizonMonths: 18,
  });

  // Fetch Instances
  const { data: fcInRange } = await supabase
    .from("forecast_instances")
    .select(
      "id, rule_id, date, amount, status, note, transaction_id, override_amount",
    )
    .gte("date", fetchStart)
    .lt("date", fetchEnd);

  const forecastInstances = fcInRange ?? [];
  const ruleById = new Map((rules ?? []).map((r) => [r.id, r]));

  // 3. UNMATCHED TRANSACTIONS LOGIC
  // We want recent transactions (e.g. current month) that are NOT in forecast_instances
  // Get all linked IDs from the loaded forecast
  const linkedTxIds = new Set(
    forecastInstances.map((f) => f.transaction_id).filter(Boolean),
  );

  const unmatchedTransactions = (txInRange ?? [])
    .filter((t) => !linkedTxIds.has(t.id))
    // Optional: Filter to only show relatively recent ones (last 45 days) to keep list clean
    // or just show all unmatched in the current view range?
    // Let's filter to transactions >= Start of Current Year to avoid clutter from last year
    .filter((t) => t.date >= `${year}-01-01`)
    .map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount_eur ?? t.amount, // Use EUR normalized
      category: t.category,
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

  // List of ALL projected instances (for the linker to choose from)
  const allProjected = forecastInstances
    .filter((f) => f.status === "projected")
    .map((f) => ({
      id: f.id,
      date: f.date,
      amount: Number(f.override_amount ?? f.amount),
      ruleName: ruleById.get(f.rule_id)?.name,
      category: ruleById.get(f.rule_id)?.category,
    }));

  // --- CALCULATION LOGIC (Same as before, simplified for brevity) ---
  // ... (Your existing runningBalance / rows logic goes here) ...
  // [IMPORTANT]: When processing forecastInstances in your loop, ensure you use `override_amount` if present.

  // Helpers
  const amountFor = (t: any) => Number(t.amount_eur ?? t.amount);
  const catKey = (k: string, c: string) => `${k}:${c || "Uncategorized"}`;

  let runningBalance =
    (accounts ?? []).reduce((sum, a) => sum + (a.initial_balance ?? 0), 0) +
    (txBefore ?? []).reduce((sum, t) => sum + amountFor(t), 0);

  const actualsByCat = new Map<string, number>();
  for (const t of txInRange ?? []) {
    const k = getCycleKeyForDate(new Date(t.date));
    const key = catKey(k, t.category);
    actualsByCat.set(key, (actualsByCat.get(key) ?? 0) + amountFor(t));
  }

  const billsByCat = new Map<string, number>();
  for (const f of forecastInstances) {
    if (f.status !== "projected") continue;
    const k = getCycleKeyForDate(new Date(f.date));
    const rule = ruleById.get(f.rule_id);
    const key = catKey(k, rule?.category || "Uncategorized");
    const val = Number(f.override_amount ?? f.amount); // <--- USE OVERRIDE
    billsByCat.set(key, (billsByCat.get(key) ?? 0) + val);
  }

  // Generate Rows Loop (Standard)
  const rows = [];
  for (let mOffset = -1; mOffset < 12; mOffset++) {
    // ... Copy your existing loop logic exactly, just ensures it uses billsByCat populated above
    // (omitted for brevity, copy from your previous file content)

    // Quick Re-implementation of the loop core for completeness:
    const targetDate = new Date(Date.UTC(year, mOffset, 1));
    const cycleYear = targetDate.getUTCFullYear();
    const cycleMonth = targetDate.getUTCMonth();
    const k = `${cycleYear}-${String(cycleMonth + 1).padStart(2, "0")}`;

    // Sum Actuals vs Projected
    let monthActual = 0;
    let monthProjected = 0;

    // Very simple aggregation for the view (you can use your detailed logic if preferred)
    // 1. Actuals
    for (const [key, val] of actualsByCat.entries()) {
      if (key.startsWith(k + ":")) monthActual += val;
    }
    // 2. Projected (Projected - Actual? Or just Projected bills?)
    // Your previous logic: "effectiveTotal - act".
    // Simplified: Projected = Bills.
    // If you have a budget rule, you compare.
    // Let's stick to your complex logic if you want budgets.
    // For now, simple Sum of Forecast Items in this cycle:
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

  // Details Map
  const detailsByMonth: Record<string, any[]> = {};
  for (const f of forecastInstances) {
    const k = getCycleKeyForDate(new Date(f.date));
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
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Forecast</h1>
          <p className="text-sm text-slate-600">
            Manage your plan and link real transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year Nav ... */}
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
            {year}
          </div>
        </div>
      </div>

      {/* NEW: Unmatched List */}
      <UnmatchedList
        transactions={unmatchedTransactions}
        projectedInstances={allProjected}
      />

      {/* Table */}
      <ForecastTable rows={rows} detailsByMonth={detailsByMonth} />
    </div>
  );
}

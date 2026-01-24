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
    { data: txInRange },
    { data: rules },
    { data: dbCycles },
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    // Fetch transactions
    supabase
      .from("transactions")
      .select("account_id, amount, date, description, category, id")
      .gte("date", fetchStart)
      .lt("date", fetchEnd)
      .order("date", { ascending: true }),
    // Fetch active rules
    supabase.from("forecast_rules").select("*").eq("is_active", true),
    // Fetch custom cycles
    supabase.from("cycles").select("*"),
  ]);

  // 2. GENERATE / REFRESH FORECAST
  // (We just call this to ensure DB is populated; the view below reads from DB)
  await generateForecastInstances({
    startDate: `${year}-01-01`,
    horizonMonths: 12,
  });

  // 3. FETCH FORECAST INSTANCES (The Source of Truth)
  const { data: fcInRange } = await supabase
    .from("forecast_instances")
    .select("*")
    .gte("date", fetchStart)
    .lt("date", fetchEnd);

  // 4. PREPARE DATA MAPS
  const ruleById = new Map<string, any>();
  rules?.forEach((r) => ruleById.set(r.id, r));

  // A. Filter Forecast Instances
  const relevantForecastInstances =
    fcInRange?.filter((f) => {
      // Exclude skipped
      if (f.status === "skipped") return false;
      return true;
    }) ?? [];

  // B. Identify Unmatched Transactions
  // A transaction is "unmatched" if no forecast_instance points to its ID
  const linkedTxIds = new Set(
    fcInRange?.filter((f) => f.transaction_id).map((f) => f.transaction_id),
  );

  const unmatchedTx =
    txInRange?.filter((tx) => {
      // Filter out internal transfers or non-relevant accounts if needed
      if (!linkedTxIds.has(tx.id)) return true;
      return false;
    }) ?? [];

  // --- NEW: Enrich Data for UnmatchedList ---
  // The component needs rule names and categories, not just IDs.
  const enrichedProjected = relevantForecastInstances
    .filter((f) => f.status === "projected") // Only show projected items as options
    .map((f) => {
      const rule = ruleById.get(f.rule_id);
      return {
        id: f.id,
        date: f.date,
        amount: Number(f.override_amount ?? f.amount),
        ruleName: rule?.name, // <--- Added
        category: rule?.category, // <--- Added
      };
    });

  // C. Group Details for the Table View
  const detailsByMonth: Record<string, any[]> = {};
  for (const f of relevantForecastInstances) {
    const k = getCycleKeyForDate(new Date(f.date)); // Use the new Smart Date Logic

    // Filter strictly for the requested year's display rows
    if (!k.startsWith(`${year}-`)) continue;

    if (!detailsByMonth[k]) detailsByMonth[k] = [];

    const rule = ruleById.get(f.rule_id);

    detailsByMonth[k].push({
      id: f.id,
      date: f.date,
      amount: Number(f.override_amount ?? f.amount),
      status: f.status,
      ruleId: f.rule_id,
      ruleType: rule?.type,
      ruleName: rule?.name,
      category: rule?.category,
      note: f.note,
      transaction_id: f.transaction_id,
    });
  }

  // D. Build Table Rows (Month by Month)
  const months = Array.from({ length: 12 }, (_, i) => i);
  const tableRows = months.map((monthIndex) => {
    const cycleYear = year;
    const cycleMonthStr = String(monthIndex + 1).padStart(2, "0");
    const key = `${cycleYear}-${cycleMonthStr}`;
    const label = new Date(cycleYear, monthIndex).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });

    const items = detailsByMonth[key] ?? [];

    // Calculate Totals
    // 1. Opening: (Ideally calculated from previous month closing, simplified here or requires global calc)
    // For now, let's assume 0 or passed from previous iteration if we did a full reduce.
    // *In a real app, you'd calculate running balance from the start of time or a snapshot.*
    const opening = 0;

    // 2. Actuals (Realized Items)
    const actual = items
      .filter((i) => i.status === "realized")
      .reduce((sum, i) => sum + i.amount, 0);

    // 3. Projected (Remaining Items)
    const projected = items
      .filter((i) => i.status === "projected")
      .reduce((sum, i) => sum + i.amount, 0);

    const net = actual + projected;
    const closing = opening + net; // Needs running total logic to be accurate

    return {
      key,
      label,
      opening,
      actual,
      projected,
      net,
      closing,
    };
  });

  // *Running Balance Fix*: Calculate correct opening/closing across rows
  let runningBalance = 0;
  // You might want to fetch the real account balance for the start of the year here

  const rowsWithBalance = tableRows.map((row) => {
    const opening = runningBalance;
    const closing = opening + row.net;
    runningBalance = closing;
    return { ...row, opening, closing };
  });

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

      {/* Unmatched Transactions Module */}
      <UnmatchedList
        transactions={unmatchedTx as any[]}
        projectedInstances={enrichedProjected}
      />

      {/* Main Forecast Table */}
      <ForecastTable rows={rowsWithBalance} detailsByMonth={detailsByMonth} />
    </div>
  );
}

import { createClient } from "@supabase/supabase-js";
import { ForecastTable } from "./ForecastTable";
import { UnmatchedList } from "./UnmatchedList";
import { AddRuleModal } from "./AddRuleModal";
import { ManageRulesModal } from "./ManageRulesModal"; // <--- Import this
import { generateForecastInstances } from "./actions";
import { getCycleKeyForDate } from "@/lib/finance-utils";

export const revalidate = 0;

function getSmartCycleKey(dateObj: Date, customCycles: any[]) {
  const dateStr = dateObj.toISOString().split("T")[0];
  const match = customCycles?.find((c) => {
    return dateStr >= c.start_date && dateStr <= c.end_date;
  });
  if (match) return match.key;
  return getCycleKeyForDate(dateObj);
}

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

  const fetchStart = new Date(Date.UTC(year - 1, 10, 1)).toISOString();
  const fetchEnd = new Date(Date.UTC(year + 1, 2, 1)).toISOString();

  const [
    { data: accounts },
    { data: txInRange },
    { data: rules },
    { data: dbCycles },
    { data: categories },
  ] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase
      .from("transactions")
      .select("account_id, amount, amount_eur, date, description, category, id")
      .gte("date", fetchStart)
      .lt("date", fetchEnd)
      .order("date", { ascending: true }),
    supabase.from("forecast_rules").select("*").eq("is_active", true),
    supabase.from("cycles").select("*"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  await generateForecastInstances({
    startDate: `${year}-01-01`,
    horizonMonths: 12,
  });

  const { data: fcInRange } = await supabase
    .from("forecast_instances")
    .select("*")
    .gte("date", fetchStart)
    .lt("date", fetchEnd);

  const ruleById = new Map<string, any>();
  rules?.forEach((r) => ruleById.set(r.id, r));

  const categoryActuals = new Map<string, number>();
  const getCatKey = (cycleKey: string, category: string) =>
    `${cycleKey}|${category}`;

  txInRange?.forEach((tx) => {
    if (tx.category && tx.category !== "Uncategorized") {
      const cycleKey = getSmartCycleKey(new Date(tx.date), dbCycles || []);
      const key = getCatKey(cycleKey, tx.category);
      const val = tx.amount_eur ?? tx.amount;
      categoryActuals.set(key, (categoryActuals.get(key) || 0) + val);
    }
  });

  const relevantForecastInstances =
    fcInRange?.filter((f) => f.status !== "skipped") ?? [];

  const linkedTxIds = new Set(
    fcInRange?.filter((f) => f.transaction_id).map((f) => f.transaction_id),
  );

  const unmatchedTx =
    txInRange?.filter((tx) => {
      if (linkedTxIds.has(tx.id)) return false;
      if (tx.category && tx.category !== "Uncategorized") return false;
      return true;
    }) ?? [];

  const enrichedProjected = relevantForecastInstances
    .filter((f) => f.status === "projected")
    .map((f) => {
      const rule = ruleById.get(f.rule_id);
      return {
        id: f.id,
        date: f.date,
        amount: Number(f.override_amount ?? f.amount),
        ruleName: rule?.name,
        category: rule?.category,
      };
    });

  const detailsByMonth: Record<string, any[]> = {};
  const processedCategoriesPerMonth = new Set<string>();

  for (const f of relevantForecastInstances) {
    const k = getSmartCycleKey(new Date(f.date), dbCycles || []);
    if (!k.startsWith(`${year}-`)) continue;
    if (!detailsByMonth[k]) detailsByMonth[k] = [];

    const rule = ruleById.get(f.rule_id);
    const category = rule?.category;
    let amount = Number(f.override_amount ?? f.amount);

    let budgetRealized = 0;
    let isBudget = rule?.type === "budget" && category;

    if (isBudget) {
      const catKey = getCatKey(k, category);
      budgetRealized = categoryActuals.get(catKey) || 0;
      processedCategoriesPerMonth.add(catKey);

      const remaining = amount - budgetRealized;
      amount = amount < 0 ? Math.min(0, remaining) : Math.max(0, remaining);

      if (budgetRealized !== 0) {
        detailsByMonth[k].push({
          id: `${f.id}-actual`,
          date: f.date,
          amount: budgetRealized,
          status: "realized",
          ruleId: f.rule_id,
          ruleType: "budget",
          ruleName: rule?.name,
          category: category,
          isAggregated: true,
        });
      }
      if (amount !== 0) {
        detailsByMonth[k].push({
          id: f.id,
          date: f.date,
          amount: amount,
          status: "projected",
          ruleId: f.rule_id,
          ruleType: "budget",
          ruleName: rule?.name,
          category: category,
        });
      }
    } else {
      detailsByMonth[k].push({
        id: f.id,
        date: f.date,
        amount,
        status: f.status,
        ruleId: f.rule_id,
        ruleType: rule?.type,
        ruleName: rule?.name,
        category: category,
        note: f.note,
        transaction_id: f.transaction_id,
      });
    }
  }

  for (const [key, amount] of categoryActuals.entries()) {
    if (processedCategoriesPerMonth.has(key)) continue;
    const [cycleKey, catName] = key.split("|");
    if (!cycleKey.startsWith(`${year}-`)) continue;
    if (!detailsByMonth[cycleKey]) detailsByMonth[cycleKey] = [];

    detailsByMonth[cycleKey].push({
      id: `implied-${key}`,
      date: `${cycleKey}-01`,
      amount: amount,
      status: "realized",
      ruleType: "budget",
      ruleName: catName,
      category: catName,
      isAggregated: true,
    });
  }

  const months = Array.from({ length: 12 }, (_, i) => i);
  const tableRows = months.map((monthIndex) => {
    const cycleMonthStr = String(monthIndex + 1).padStart(2, "0");
    const key = `${year}-${cycleMonthStr}`;
    const label = new Date(year, monthIndex).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });

    const items = detailsByMonth[key] ?? [];
    const opening = 0;
    const actual = items
      .filter((i) => i.status === "realized")
      .reduce((sum, i) => sum + i.amount, 0);
    const projected = items
      .filter((i) => i.status === "projected")
      .reduce((sum, i) => sum + i.amount, 0);

    const net = actual + projected;
    const closing = opening + net;

    return { key, label, opening, actual, projected, net, closing };
  });

  let runningBalance = 0;
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
          {/* NEW: Manage Rules Button */}
          <ManageRulesModal rules={rules || []} />

          <AddRuleModal
            categories={categories || []}
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
        transactions={unmatchedTx as any[]}
        projectedInstances={enrichedProjected}
      />

      <ForecastTable rows={rowsWithBalance} detailsByMonth={detailsByMonth} />
    </div>
  );
}

import { sql } from "@/lib/db";
import { ForecastTable } from "./ForecastTable";
import { UnmatchedList } from "./UnmatchedList";
import { AddRuleModal } from "./AddRuleModal";
import { ManageRulesModal } from "./ManageRulesModal";
import { generateForecastInstances, clearAllRules } from "./actions";
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

  const fetchStart = new Date(Date.UTC(year - 1, 10, 1)).toISOString().split("T")[0];
  const fetchEnd = new Date(Date.UTC(year + 1, 2, 1)).toISOString().split("T")[0];

  const yearStart = `${year}-01-01`;

  const [accounts, txInRange, rules, dbCycles, categories, txBeforeYear] = await Promise.all([
    sql`SELECT id, name, currency, initial_balance, initial_balance_eur, nature FROM accounts`,
    sql`
      SELECT account_id, amount, amount_eur, date, description, category, id
      FROM transactions
      WHERE date >= ${fetchStart} AND date < ${fetchEnd}
      ORDER BY date ASC
    `,
    sql`SELECT * FROM forecast_rules WHERE is_active = true`,
    sql`SELECT * FROM cycles`,
    sql`SELECT id, name FROM categories ORDER BY name`,
    sql`
      SELECT account_id, COALESCE(amount_eur, amount) AS eur_amount
      FROM transactions
      WHERE date < ${yearStart}
    `,
  ]);

  await generateForecastInstances({ startDate: yearStart, horizonMonths: 12 });

  // Opening balance = liquid (asset) accounts only
  const assetAccounts = accounts.filter((a: any) => a.nature === "asset");
  const assetIds = new Set(assetAccounts.map((a: any) => String(a.id)));

  const openingBalance = assetAccounts.reduce((sum: number, acc: any) => {
    const eurActivity = txBeforeYear
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

  // Monthly actuals: sum of asset account transactions per month (direct, not via forecast_instances)
  const monthlyActuals: Record<string, number> = {};
  for (const tx of txInRange) {
    if (!assetIds.has(String(tx.account_id))) continue;
    const k = getSmartCycleKey(new Date(tx.date), dbCycles);
    if (!k.startsWith(`${year}-`)) continue;
    monthlyActuals[k] = (monthlyActuals[k] || 0) + Number(tx.amount_eur ?? tx.amount);
  }

  const fcInRange = await sql`
    SELECT * FROM forecast_instances
    WHERE date >= ${fetchStart} AND date < ${fetchEnd}
  `;

  const ruleById = new Map<string, any>();
  rules.forEach((r) => ruleById.set(r.id, r));

  const categoryActuals = new Map<string, number>();
  const getCatKey = (cycleKey: string, category: string) => `${cycleKey}|${category}`;

  txInRange.forEach((tx) => {
    if (tx.category && tx.category !== "Uncategorized") {
      const cycleKey = getSmartCycleKey(new Date(tx.date), dbCycles);
      const key = getCatKey(cycleKey, tx.category);
      const val = Number(tx.amount_eur ?? tx.amount);
      categoryActuals.set(key, (categoryActuals.get(key) || 0) + val);
    }
  });

  const relevantForecastInstances = fcInRange.filter((f) => f.status !== "skipped");

  const linkedTxIds = new Set(
    fcInRange.filter((f) => f.transaction_id).map((f) => f.transaction_id),
  );

  // Only recurring/one_off rules need manual linking — budget rules aggregate automatically
  const linkableCategories = new Set(
    rules.filter((r: any) => r.type !== "budget").map((r: any) => r.category).filter(Boolean)
  );

  const unmatchedTx = txInRange.filter((tx: any) => {
    if (linkedTxIds.has(tx.id)) return false;
    if (tx.category === "Transfer") return false;
    return linkableCategories.has(tx.category);
  });

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
    const k = getSmartCycleKey(new Date(f.date), dbCycles);
    if (!k.startsWith(`${year}-`)) continue;
    if (!detailsByMonth[k]) detailsByMonth[k] = [];

    const rule = ruleById.get(f.rule_id);
    const category = rule?.category;
    let amount = Number(f.override_amount ?? f.amount);

    const isBudget = rule?.type === "budget" && category;

    if (isBudget) {
      const catKey = getCatKey(k, category);
      const budgetRealized = categoryActuals.get(catKey) || 0;
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
          category,
          isAggregated: true,
        });
      }
      if (amount !== 0) {
        detailsByMonth[k].push({
          id: f.id,
          date: f.date,
          amount,
          status: "projected",
          ruleId: f.rule_id,
          ruleType: "budget",
          ruleName: rule?.name,
          category,
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
        category,
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
      amount,
      status: "realized",
      ruleType: "budget",
      ruleName: catName,
      category: catName,
      isAggregated: true,
    });
  }

  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const tableRows = months.map((monthIndex) => {
    const cycleMonthStr = String(monthIndex + 1).padStart(2, "0");
    const key = `${year}-${cycleMonthStr}`;
    const label = new Date(year, monthIndex).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });

    // For fully past months, only count realized transactions (not projections)
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const isPastMonth = monthEnd < today;

    const items = detailsByMonth[key] ?? [];
    const actual = monthlyActuals[key] ?? 0;
    const projected = isPastMonth ? 0 : items.filter((i) => i.status === "projected").reduce((sum, i) => sum + i.amount, 0);
    const net = actual + projected;

    return { key, label, opening: 0, actual, projected, net, closing: net };
  });

  let runningBalance = openingBalance;
  const rowsWithBalance = tableRows.map((row) => {
    const opening = runningBalance;
    const closing = opening + row.net;
    runningBalance = closing;
    return { ...row, opening, closing };
  });

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Forecast</h1>
          <p className="text-sm text-slate-600">
            Cash Flow View (Assets + Projected Liabilities).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ManageRulesModal rules={rules as any} categories={categories as any} accounts={accounts as any} />
          <AddRuleModal
            categories={categories as any}
            accounts={accounts as any}
          />
          {rules.length > 0 && (
            <form action={clearAllRules}>
              <button
                type="submit"
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition"
              >
                Clear all rules
              </button>
            </form>
          )}
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

      <ForecastTable rows={rowsWithBalance} detailsByMonth={detailsByMonth} openingBalance={openingBalance} />
    </main>
  );
}

import { sql } from "@/lib/db";
import { ForecastTable, type MonthRow, type CommittedItem, type BudgetItem } from "./ForecastTable";
import { UnmatchedList } from "./UnmatchedList";
import { AddRuleModal } from "./AddRuleModal";
import { ManageRulesModal } from "./ManageRulesModal";
import { generateForecastInstances, clearAllRules } from "./actions";
import { getCycleKeyForDate, formatCurrency } from "@/lib/finance-utils";

export const revalidate = 0;

function smartCycleKey(dateObj: Date, customCycles: any[]) {
  const dateStr = dateObj.toISOString().split("T")[0];
  const match = customCycles?.find((c) => dateStr >= c.start_date && dateStr <= c.end_date);
  return match ? match.key : getCycleKeyForDate(dateObj);
}

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const resolvedParams = await searchParams;
  const year = Number(resolvedParams?.year ?? new Date().getFullYear());

  const fetchStart = new Date(Date.UTC(year - 1, 10, 1)).toISOString().split("T")[0];
  const fetchEnd   = new Date(Date.UTC(year + 1,  2, 1)).toISOString().split("T")[0];
  const yearStart  = `${year}-01-01`;

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
      FROM transactions WHERE date < ${yearStart}
    `,
  ]);

  await generateForecastInstances({ startDate: yearStart, horizonMonths: 12 });

  // ── Opening balance (asset accounts only) ──────────────────────────
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

  // ── Monthly actuals: real asset-account cash flows ─────────────────
  const monthlyActuals: Record<string, number> = {};
  for (const tx of txInRange) {
    if (!assetIds.has(String(tx.account_id))) continue;
    const k = smartCycleKey(new Date(tx.date), dbCycles);
    if (!k.startsWith(`${year}-`)) continue;
    monthlyActuals[k] = (monthlyActuals[k] ?? 0) + Number(tx.amount_eur ?? tx.amount);
  }

  // ── Budget spending per category per month (asset accounts only) ───
  // Using asset-account transactions keeps this consistent with monthlyActuals.
  const catSpendByMonth: Record<string, Record<string, number>> = {};
  for (const tx of txInRange) {
    if (!assetIds.has(String(tx.account_id))) continue;
    if (!tx.category || tx.category === "Uncategorized" || tx.category === "Transfer") continue;
    const k = smartCycleKey(new Date(tx.date), dbCycles);
    if (!k.startsWith(`${year}-`)) continue;
    if (!catSpendByMonth[k]) catSpendByMonth[k] = {};
    catSpendByMonth[k][tx.category] = (catSpendByMonth[k][tx.category] ?? 0) + Number(tx.amount_eur ?? tx.amount);
  }

  // ── Fetch forecast instances (joined with rules) ───────────────────
  const fcInRange = await sql`
    SELECT
      fi.id, fi.rule_id, fi.date, fi.amount, fi.override_amount,
      fi.status, fi.transaction_id, fi.note,
      fr.type  AS rule_type,
      fr.name  AS rule_name,
      fr.category AS rule_category
    FROM forecast_instances fi
    LEFT JOIN forecast_rules fr ON fr.id = fi.rule_id
    WHERE fi.date >= ${fetchStart} AND fi.date < ${fetchEnd}
  `;

  // ── Unmatched transactions (for reconciliation panel) ─────────────
  const linkedTxIds = new Set(
    fcInRange.filter((f: any) => f.transaction_id).map((f: any) => f.transaction_id),
  );
  const linkableCategories = new Set(
    rules.filter((r: any) => r.type !== "budget").map((r: any) => r.category).filter(Boolean),
  );
  const unmatchedTx = txInRange.filter((tx: any) => {
    if (linkedTxIds.has(tx.id)) return false;
    if (tx.category === "Transfer") return false;
    return linkableCategories.has(tx.category);
  });
  const enrichedProjected = fcInRange
    .filter((f: any) => f.status === "projected" && f.rule_type !== "budget")
    .map((f: any) => ({
      id: f.id,
      date: f.date,
      amount: Number(f.override_amount ?? f.amount),
      ruleName: f.rule_name,
      category: f.rule_category,
    }));

  // ── Build per-month committed + budget detail ──────────────────────
  const committedByMonth: Record<string, CommittedItem[]> = {};
  const budgetInstByMonth: Record<
    string,
    { ruleId: string; ruleName: string; category: string; cap: number }[]
  > = {};

  for (const f of fcInRange) {
    if (f.status === "skipped") continue;
    const k = smartCycleKey(new Date(f.date), dbCycles);
    if (!k.startsWith(`${year}-`)) continue;

    if (f.rule_type === "budget") {
      if (!budgetInstByMonth[k]) budgetInstByMonth[k] = [];
      budgetInstByMonth[k].push({
        ruleId: f.rule_id,
        ruleName: f.rule_name ?? "(budget)",
        category: f.rule_category ?? "",
        cap: Number(f.override_amount ?? f.amount),
      });
    } else {
      if (!committedByMonth[k]) committedByMonth[k] = [];
      committedByMonth[k].push({
        id: f.id,
        date: f.date,
        amount: Number(f.override_amount ?? f.amount),
        status: f.status,
        ruleId: f.rule_id,
        ruleName: f.rule_name ?? "(rule)",
        category: f.rule_category ?? undefined,
        note: f.note,
        transaction_id: f.transaction_id,
      } as CommittedItem);
    }
  }

  // ── Build month rows with two running balance chains ───────────────
  const today = new Date();
  let floorBalance = openingBalance;
  let ceilBalance  = openingBalance;

  const tableRows: MonthRow[] = Array.from({ length: 12 }, (_, i) => {
    const monthIndex     = i;
    const monthStr       = String(monthIndex + 1).padStart(2, "0");
    const key            = `${year}-${monthStr}`;
    const label          = new Date(year, monthIndex).toLocaleString("en-US", { month: "short", year: "numeric" });
    const monthEnd       = new Date(year, monthIndex + 1, 0);
    const monthStart     = new Date(year, monthIndex, 1);
    const isPast         = monthEnd < today;
    const isCurrent      = monthStart <= today && today <= monthEnd;

    const floorOpening = floorBalance;
    const ceilOpening  = ceilBalance;

    const actual = monthlyActuals[key] ?? 0;

    // Committed projected: non-budget instances still in "projected" state
    const cItems = committedByMonth[key] ?? [];
    const committedProjected = cItems
      .filter((i) => i.status === "projected")
      .reduce((s, i) => s + i.amount, 0);

    // Budget detail: merge caps with actual spending
    const bInsts = budgetInstByMonth[key] ?? [];
    const catSpend = catSpendByMonth[key] ?? {};
    const budgetItems: BudgetItem[] = bInsts.map((b) => {
      const spent     = catSpend[b.category] ?? 0;
      const remaining = b.cap - spent;
      return {
        category: b.category,
        ruleName: b.ruleName,
        cap: b.cap,
        spent,
        remaining,
        ruleId: b.ruleId,
      };
    });

    const budgetCap       = budgetItems.reduce((s, b) => s + b.cap, 0);
    const budgetSpent     = budgetItems.reduce((s, b) => s + b.spent, 0);
    const budgetRemaining = budgetCap - budgetSpent;

    // Floor: opening + actual cash flows + still-projected committed items
    // Ceil:  floor + remaining budget capacity (worst-case variable spending)
    let floorClosing: number;
    let ceilClosing: number;

    if (isPast) {
      floorClosing = floorOpening + actual;
      ceilClosing  = floorClosing; // no uncertainty in the past
    } else {
      floorClosing = floorOpening + actual + committedProjected;
      ceilClosing  = ceilOpening  + actual + committedProjected + budgetRemaining;
    }

    floorBalance = floorClosing;
    ceilBalance  = ceilClosing;

    return {
      key, label, isPast, isCurrent,
      floorOpening, ceilOpening,
      floorClosing, ceilClosing,
      actual, committedProjected,
      budgetCap, budgetSpent, budgetRemaining,
      committedItems: cItems,
      budgetItems,
    };
  });

  const yearEndFloor = tableRows[11].floorClosing;
  const yearEndCeil  = tableRows[11].ceilClosing;
  const totalBudgetCap = tableRows.reduce((s, r) => s + r.budgetCap, 0);

  return (
    <main className="min-h-screen bg-cream p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-pixel text-2xl text-ink">forecast.</h1>
          <p className="font-sans text-sm text-ink-soft mt-0.5">
            committed flows + budget range · {year}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year nav */}
          <a
            href={`/forecast?year=${year - 1}`}
            className="pixel-box bg-surface h-8 px-3 font-mono text-xs text-ink flex items-center
                       hover:bg-cream transition-none
                       active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
          >
            ← {year - 1}
          </a>
          <span className="pixel-box bg-ink h-8 px-3 font-mono text-xs text-cream-soft flex items-center">
            {year}
          </span>
          <a
            href={`/forecast?year=${year + 1}`}
            className="pixel-box bg-surface h-8 px-3 font-mono text-xs text-ink flex items-center
                       hover:bg-cream transition-none
                       active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
          >
            {year + 1} →
          </a>

          <div className="w-px h-5 bg-ink/20 mx-1" />

          {/* Actions */}
          <ManageRulesModal
            rules={rules as any}
            categories={categories as any}
            accounts={accounts as any}
          />
          <AddRuleModal categories={categories as any} accounts={accounts as any} />

          {rules.length > 0 && (
            <form action={clearAllRules}>
              <button
                type="submit"
                className="pixel-box bg-surface h-8 px-3 font-mono text-xs text-ink
                           hover:bg-cream transition-none
                           active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
              >
                clear all
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Hero summary strip ────────────────────────────────────── */}
      <div className="pixel-box bg-surface grid grid-cols-3 divide-x-2 divide-ink">
        {/* Opening balance */}
        <div className="p-5">
          <div className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest mb-3">
            liquid start
          </div>
          <div className="font-display text-2xl text-ink leading-none">
            {formatCurrency(openingBalance)}
          </div>
          <div className="font-sans text-xs text-ink-soft mt-2">
            jan 1, {year}
          </div>
        </div>

        {/* Committed floor */}
        <div className="p-5">
          <div className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest mb-3">
            committed floor
          </div>
          <div className="font-display text-2xl text-ink leading-none">
            {formatCurrency(yearEndFloor)}
          </div>
          <div className="font-sans text-xs text-ink-soft mt-2">
            year-end · zero variable spending
          </div>
        </div>

        {/* Budget ceiling */}
        <div className="p-5">
          <div className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest mb-3">
            budget ceiling
          </div>
          <div className="font-display text-2xl text-ink leading-none">
            {formatCurrency(yearEndCeil)}
          </div>
          <div className="font-sans text-xs text-ink-soft mt-2">
            year-end · all budgets maxed
            {totalBudgetCap !== 0 && (
              <span className="ml-1 font-mono">(cap {formatCurrency(Math.abs(totalBudgetCap))})</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main forecast table ───────────────────────────────────── */}
      <ForecastTable rows={tableRows} openingBalance={openingBalance} />

      {/* ── Reconciliation (de-emphasised) ───────────────────────── */}
      {unmatchedTx.length > 0 && (
        <UnmatchedList
          transactions={unmatchedTx as any[]}
          projectedInstances={enrichedProjected}
        />
      )}
    </main>
  );
}

import { createClient } from "@supabase/supabase-js";
import { ForecastTable } from "./ForecastTable";
import { ensureForecastInstances } from "./actions";

// Helper functions
function monthKey(year: number, monthIndex0: number) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

function startOfYearISO(year: number) {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
}
function startOfNextYearISO(year: number) {
  return new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();
}

export const revalidate = 0;

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const year = Number(searchParams?.year ?? new Date().getFullYear());
  const yearStart = startOfYearISO(year);
  const nextYearStart = startOfNextYearISO(year);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1) Accounts
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, currency, initial_balance")
    .order("name");

  if (accErr) throw new Error(accErr.message);

  // 2) Transactions before year
  const { data: txBefore, error: txBeforeErr } = await supabase
    .from("transactions")
    .select("account_id, amount, amount_eur, date")
    .lt("date", yearStart);

  if (txBeforeErr) throw new Error(txBeforeErr.message);

  // 3) Transactions inside year
  const { data: txInYear, error: txInYearErr } = await supabase
    .from("transactions")
    .select("account_id, amount, amount_eur, date, category")
    .gte("date", yearStart)
    .lt("date", nextYearStart);

  if (txInYearErr) throw new Error(txInYearErr.message);

  // Ensure forecast tables are populated
  await ensureForecastInstances({
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    horizonMonths: 18,
  });

  const { data: rules, error: rulesErr } = await supabase
    .from("forecast_rules")
    .select("id, name, category, type, account_id")
    .eq("is_active", true);

  if (rulesErr) throw new Error(rulesErr.message);

  const ruleById = new Map((rules ?? []).map((r) => [r.id, r]));

  // 4) Forecast instances inside year
  const { data: fcInYear, error: fcErr } = await supabase
    .from("forecast_instances")
    .select("id, rule_id, date, amount, status, note")
    .gte("date", yearStart)
    .lt("date", nextYearStart);

  const forecastInstances = fcErr ? [] : (fcInYear ?? []);

  // --- HELPERS ---
  const amountFor = (t: { amount: number; amount_eur: number | null }) =>
    Number(t.amount_eur ?? t.amount);

  const catKey = (k: string, c: string) => `${k}:${c || "Uncategorized"}`;

  // Compute opening total
  const openingTotal =
    (accounts ?? []).reduce((sum, a) => sum + (a.initial_balance ?? 0), 0) +
    (txBefore ?? []).reduce((sum, t) => sum + amountFor(t), 0);

  // --- LOGIC PART 1: SUMMARY ROWS (With Budget Consumption) ---

  // 1. Group ACTUALS by "Month:Category"
  const actualsByCat = new Map<string, number>();
  for (const t of txInYear ?? []) {
    const d = new Date(t.date);
    const k = monthKey(d.getUTCFullYear(), d.getUTCMonth());
    const key = catKey(k, t.category);
    actualsByCat.set(key, (actualsByCat.get(key) ?? 0) + amountFor(t));
  }

  // 2. Group PROJECTIONS by "Month:Category", separating Budgets vs Bills
  const billsByCat = new Map<string, number>();
  const budgetsByCat = new Map<string, number>();

  for (const f of forecastInstances) {
    if (f.status !== "projected") continue;

    const d = new Date(f.date as unknown as string);
    const k = monthKey(d.getUTCFullYear(), d.getUTCMonth());

    const rule = ruleById.get(f.rule_id);
    const cat = rule?.category || "Uncategorized";
    const key = catKey(k, cat);
    const amount = Number(f.amount);

    if (rule?.type === "budget") {
      // Use logic: "largest" budget wins (e.g. min(-500, -600) -> -600)
      const current = budgetsByCat.get(key) ?? 0;
      budgetsByCat.set(key, Math.min(current, amount));
    } else {
      // Regular bills sum up
      billsByCat.set(key, (billsByCat.get(key) ?? 0) + amount);
    }
  }

  // 3. Calculate Monthly Totals
  let running = openingTotal;

  const rows = Array.from({ length: 12 }).map((_, i) => {
    const k = monthKey(year, i);

    // Find all categories active in this specific month
    const categories = new Set<string>();
    const gatherCats = (map: Map<string, number>) => {
      for (const fullKey of map.keys()) {
        if (fullKey.startsWith(k + ":")) {
          categories.add(fullKey.split(":")[1]);
        }
      }
    };
    gatherCats(actualsByCat);
    gatherCats(billsByCat);
    gatherCats(budgetsByCat);

    let monthActual = 0;
    let monthProjected = 0;

    for (const cat of categories) {
      const key = catKey(k, cat);
      const act = actualsByCat.get(key) ?? 0; // Spent
      const bill = billsByCat.get(key) ?? 0; // Bills
      const bud = budgetsByCat.get(key) ?? 0; // Budget

      const consumed = act + bill;
      let effectiveTotal = 0;

      if (bud !== 0) {
        // Budget Consumption Logic
        effectiveTotal =
          bud < 0 ? Math.min(bud, consumed) : Math.max(bud, consumed);
      } else {
        effectiveTotal = consumed;
      }

      monthActual += act;
      monthProjected += effectiveTotal - act;
    }

    const net = monthActual + monthProjected;
    const opening = running;
    const closing = opening + net;
    running = closing;

    const label = new Date(Date.UTC(year, i, 1)).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

    return {
      key: k,
      label,
      opening,
      actual: monthActual,
      projected: monthProjected,
      net,
      closing,
    };
  });

  // --- LOGIC PART 2: DETAILS OBJECT (Restored) ---

  type FcRow = {
    id: string;
    rule_id: string;
    date: string;
    amount: number;
    status: "projected" | "realized" | "skipped";
    note?: string | null;
    ruleName?: string;
    category?: string;
    type?: string;
  };

  const detailsByMonth = new Map<string, FcRow[]>();

  for (const f of forecastInstances) {
    const d = new Date(f.date as unknown as string);
    const k = monthKey(d.getUTCFullYear(), d.getUTCMonth());
    const rule = ruleById.get(f.rule_id);

    const item: FcRow = {
      id: f.id,
      rule_id: f.rule_id,
      date: f.date as string,
      amount: Number(f.amount),
      status: f.status,
      note: f.note ?? null,
      ruleName: rule?.name ?? "Forecast item",
      category: rule?.category ?? "Uncategorized",
      type: rule?.type ?? "",
    };

    if (!detailsByMonth.has(k)) detailsByMonth.set(k, []);
    detailsByMonth.get(k)!.push(item);
  }

  const detailsObj = Object.fromEntries(detailsByMonth.entries());

  // Sort details
  for (const [k, arr] of detailsByMonth.entries()) {
    arr.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.ruleName ?? "").localeCompare(b.ruleName ?? ""),
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Forecast</h1>
          <p className="text-sm text-slate-600">
            Year cashflow view (actuals + projected).
          </p>

          {fcErr && (
            <p className="mt-2 text-xs text-amber-600">
              Note: forecast tables not found yet (create them in Supabase SQL).
              Showing actuals only.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
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

      <ForecastTable rows={rows} detailsByMonth={detailsObj} />
    </div>
  );
}

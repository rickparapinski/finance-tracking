import { createClient } from "@supabase/supabase-js";
import { ForecastTable } from "./ForecastTable";

function monthKey(year: number, monthIndex0: number) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

function startOfYearISO(year: number) {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
}
function startOfNextYearISO(year: number) {
  return new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();
}
import { ensureForecastInstances } from "./actions";

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

  // 1) Accounts (need initial_balance + currency)
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, currency, initial_balance")
    .order("name");

  if (accErr) throw new Error(accErr.message);

  // 2) Transactions before year (for opening balance)
  const { data: txBefore, error: txBeforeErr } = await supabase
    .from("transactions")
    .select("account_id, amount, amount_eur, date")
    .lt("date", yearStart);

  if (txBeforeErr) throw new Error(txBeforeErr.message);

  // 3) Transactions inside year (actuals)
  const { data: txInYear, error: txInYearErr } = await supabase
    .from("transactions")
    .select("account_id, amount, amount_eur, date")
    .gte("date", yearStart)
    .lt("date", nextYearStart);

  if (txInYearErr) throw new Error(txInYearErr.message);
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
  // 4) Forecast instances inside year (projected)
  // If tables exist but empty, this returns [].
  // If you haven't created the tables yet, Supabase will return an error.
  const { data: fcInYear, error: fcErr } = await supabase
    .from("forecast_instances")
    .select("id, rule_id, date, amount, status, note")
    .gte("date", yearStart)
    .lt("date", nextYearStart);

  // If you haven’t created the tables yet, show a helpful message instead of crashing
  const forecastInstances = fcErr ? [] : (fcInYear ?? []);

  // Helpers
  const amountFor = (t: { amount: number; amount_eur: number | null }) =>
    Number(t.amount_eur ?? t.amount);

  // Compute opening total (all accounts)
  const openingTotal =
    (accounts ?? []).reduce((sum, a) => sum + (a.initial_balance ?? 0), 0) +
    (txBefore ?? []).reduce((sum, t) => sum + amountFor(t), 0);

  // --- NEW LOGIC START ---

  // Helper to safely parse amounts
  const amountFor = (t: { amount: number; amount_eur: number | null }) =>
    Number(t.amount_eur ?? t.amount);

  // Helper to build compound keys "YYYY-MM:Category"
  const catKey = (k: string, c: string) => `${k}:${c || "Uncategorized"}`;

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
    if (f.status !== "projected") continue; // Only look at future/unlinked items

    const d = new Date(f.date as unknown as string);
    const k = monthKey(d.getUTCFullYear(), d.getUTCMonth());

    const rule = ruleById.get(f.rule_id);
    const cat = rule?.category || "Uncategorized";
    const key = catKey(k, cat);
    const amount = Number(f.amount);

    if (rule?.type === "budget") {
      // If multiple budgets exist for one category (rare), take the "largest" (most negative)
      // e.g. Min(-500, -600) -> -600
      const current = budgetsByCat.get(key) ?? 0;
      budgetsByCat.set(key, Math.min(current, amount));
    } else {
      // Regular recurring bills / one-offs just sum up
      billsByCat.set(key, (billsByCat.get(key) ?? 0) + amount);
    }
  }

  // 3. Calculate Totals per Month with "Consumption Logic"
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
      const act = actualsByCat.get(key) ?? 0; // Already spent
      const bill = billsByCat.get(key) ?? 0; // Fixed upcoming bills
      const bud = budgetsByCat.get(key) ?? 0; // The budget limit

      // LOGIC: The Budget covers both 'Actuals' and 'Fixed Bills'
      // If Budget is -500. Act is -100. Bill is -50.
      // We have 'consumed' -150 so far.
      // We take the "more negative" of (Budget) vs (Consumed).

      const consumed = act + bill;
      let effectiveTotal = 0;

      if (bud !== 0) {
        // If it's an Expense Budget (negative), take the lower number (Min)
        // If it's an Income Target (positive), take the higher number (Max)
        effectiveTotal =
          bud < 0 ? Math.min(bud, consumed) : Math.max(bud, consumed);
      } else {
        // No budget? Just sum the reality + bills
        effectiveTotal = consumed;
      }

      monthActual += act;

      // The "Projected" portion is whatever is left to reach effectiveTotal
      // e.g. Effective(-500) - Act(-100) = -400 remaining to be spent.
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

  // --- NEW LOGIC END ---

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  const clsMoney = (n: number) => {
    if (n > 0.005) return "text-emerald-700";
    if (n < -0.005) return "text-rose-700";
    return "text-slate-700";
  };

  const clsMoneyStrong = (n: number) => {
    if (n > 0.005) return "text-emerald-800";
    if (n < -0.005) return "text-rose-800";
    return "text-slate-900";
  };
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

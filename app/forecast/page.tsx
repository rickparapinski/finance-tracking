import { createClient } from "@supabase/supabase-js";
import { ForecastTable } from "./ForecastTable";
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

  // RANGE LOGIC:
  // To show "Jan 2026", we need the cycle that likely starts Dec 25, 2025.
  // So we fetch transactions starting from Dec 1st of Prev Year to be safe.
  const fetchStart = new Date(Date.UTC(year - 1, 11, 1)).toISOString();
  // We fetch until Feb 1st of Next Year to be safe.
  const fetchEnd = new Date(Date.UTC(year + 1, 1, 1)).toISOString();

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

  // 2) Transactions before range (Opening Balance)
  const { data: txBefore, error: txBeforeErr } = await supabase
    .from("transactions")
    .select("account_id, amount, amount_eur, date")
    .lt("date", fetchStart); // We sum up to our safe fetch start

  if (txBeforeErr) throw new Error(txBeforeErr.message);

  // 3) Transactions inside range
  const { data: txInRange, error: txInRangeErr } = await supabase
    .from("transactions")
    .select("account_id, amount, amount_eur, date, category")
    .gte("date", fetchStart)
    .lt("date", fetchEnd);

  if (txInRangeErr) throw new Error(txInRangeErr.message);

  // Ensure forecast tables are populated (using standard cal year for generation is fine,
  // as long as we generate enough buffer).
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

  // 4) Forecast instances inside range
  const { data: fcInRange, error: fcErr } = await supabase
    .from("forecast_instances")
    .select("id, rule_id, date, amount, status, note")
    .gte("date", fetchStart)
    .lt("date", fetchEnd);

  const forecastInstances = fcErr ? [] : (fcInRange ?? []);

  // --- HELPERS ---
  const amountFor = (t: { amount: number; amount_eur: number | null }) =>
    Number(t.amount_eur ?? t.amount);

  const catKey = (k: string, c: string) => `${k}:${c || "Uncategorized"}`;

  // Compute opening total up to `fetchStart`
  // NOTE: This opening total is at Dec 1st (prev year).
  // We will roll it forward to the first cycle start in the loop below.
  let runningBalance =
    (accounts ?? []).reduce((sum, a) => sum + (a.initial_balance ?? 0), 0) +
    (txBefore ?? []).reduce((sum, t) => sum + amountFor(t), 0);

  // --- LOGIC PART 1: PRE-CALC MAPS ---

  // 1. Group ACTUALS by "CycleKey:Category"
  const actualsByCat = new Map<string, number>();
  // Also track total actuals per cycle for net calc
  const actualsByCycle = new Map<string, number>();

  for (const t of txInRange ?? []) {
    const d = new Date(t.date);
    const k = getCycleKeyForDate(d); // e.g. "2026-01"

    // Safety: ignore if it falls outside our year of interest (e.g. into 2027-02)
    // Actually we want to process it if it helps the running balance.

    const val = amountFor(t);
    const key = catKey(k, t.category);
    actualsByCat.set(key, (actualsByCat.get(key) ?? 0) + val);
    actualsByCycle.set(k, (actualsByCycle.get(k) ?? 0) + val);
  }

  // 2. Group PROJECTIONS
  const billsByCat = new Map<string, number>();
  const budgetsByCat = new Map<string, number>();

  for (const f of forecastInstances) {
    if (f.status !== "projected") continue;

    const d = new Date(f.date as unknown as string);
    const k = getCycleKeyForDate(d);

    const rule = ruleById.get(f.rule_id);
    const cat = rule?.category || "Uncategorized";
    const key = catKey(k, cat);
    const amount = Number(f.amount);

    if (rule?.type === "budget") {
      const current = budgetsByCat.get(key) ?? 0;
      budgetsByCat.set(key, Math.min(current, amount));
    } else {
      billsByCat.set(key, (billsByCat.get(key) ?? 0) + amount);
    }
  }

  // --- LOGIC PART 2: GENERATE 12 ROWS FOR THE YEAR ---
  // We need to handle the "Gap" between fetchStart (Dec 1) and the first cycle start (Dec 25).
  // Any transaction between Dec 1 and Dec 24 belongs to "Dec Cycle (Prev Year)".
  // We must apply them to runningBalance so that Jan Cycle starts correct.

  // Let's iterate all potential cycles from the fetchStart up to year end
  // fetchStart is Year-1, Month 11.

  // We want to display rows for Year-Month 01 to 12.
  const rows = [];

  // Pre-roll loop: Calculate cycles BEFORE Jan 2026 to update runningBalance
  // (e.g. The "Dec 2025" cycle)
  const preStartMonth = 12; // 1-based index for Dec is 12
  // Actually simplest way:
  // Iterate from Dec (Year-1) to Dec (Year).
  // Only push to `rows` if it matches `year`.

  for (let mOffset = -1; mOffset < 12; mOffset++) {
    // mOffset = -1 -> Dec Prev Year
    // mOffset = 0  -> Jan Current Year

    const targetDate = new Date(Date.UTC(year, mOffset, 1));
    const cycleYear = targetDate.getUTCFullYear();
    const cycleMonth = targetDate.getUTCMonth(); // 0-11

    const k = `${cycleYear}-${String(cycleMonth + 1).padStart(2, "0")}`;

    // Cycle Dates for Label
    const startOfCycle = getCycleStartDate(cycleYear, cycleMonth - 1); // Start is in prev month usually
    const startOfNext = getCycleStartDate(cycleYear, cycleMonth);
    const endOfCycle = new Date(startOfNext);
    endOfCycle.setDate(endOfCycle.getDate() - 1);

    // Calculate this cycle's net
    // 1. Gather categories
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
      const act = actualsByCat.get(key) ?? 0;
      const bill = billsByCat.get(key) ?? 0;
      const bud = budgetsByCat.get(key) ?? 0;

      const consumed = act + bill;
      let effectiveTotal = 0;

      if (bud !== 0) {
        effectiveTotal =
          bud < 0 ? Math.min(bud, consumed) : Math.max(bud, consumed);
      } else {
        effectiveTotal = consumed;
      }

      monthActual += act;
      monthProjected += effectiveTotal - act;
    }

    const net = monthActual + monthProjected;
    const opening = runningBalance;
    const closing = opening + net;

    // Update running for next loop
    runningBalance = closing;

    // Only add to Output if it belongs to the requested year
    if (cycleYear === year) {
      const label = targetDate.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      const dateRange = `${startOfCycle.getDate()}.${startOfCycle.getMonth() + 1} - ${endOfCycle.getDate()}.${endOfCycle.getMonth() + 1}`;

      rows.push({
        key: k,
        label, // "Jan 2026"
        subLabel: dateRange, // "25.12 - 24.1"
        opening,
        actual: monthActual,
        projected: monthProjected,
        net,
        closing,
      });
    }
  }

  // --- LOGIC PART 3: DETAILS OBJECT (With Cycle Keys) ---

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
    // Use Cycle Key!
    const k = getCycleKeyForDate(d);

    // Only show details if they are in the requested year
    if (!k.startsWith(`${year}-`)) continue;

    const rule = ruleById.get(f.rule_id);
    const cat = rule?.category || "Uncategorized";

    let displayAmount = Number(f.amount);
    let displayNote = f.note ?? null;

    if (f.status === "projected" && rule?.type === "budget") {
      const catKeyStr = catKey(k, cat);
      const spentInCat = actualsByCat.get(catKeyStr) ?? 0;

      const budgetAmount = Number(f.amount);
      const budgetMag = Math.abs(budgetAmount);
      const spentMag = Math.abs(spentInCat);
      const remainingMag = Math.max(0, budgetMag - spentMag);
      const sign = budgetAmount < 0 ? -1 : 1;
      displayAmount = remainingMag * sign;
      displayNote = `Budget: ${formatCurrency(budgetAmount)} | Spent: ${formatCurrency(spentInCat)}`;
    }

    const item: FcRow = {
      id: f.id,
      rule_id: f.rule_id,
      date: f.date as string,
      amount: displayAmount,
      status: f.status,
      note: displayNote,
      ruleName: rule?.name ?? "Forecast item",
      category: cat,
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
            Cashflow based on salary cycles (25th to 24th).
          </p>
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

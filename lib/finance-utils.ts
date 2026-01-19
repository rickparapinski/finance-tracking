// lib/finance-utils.ts
import { createClient } from "@supabase/supabase-js"; // <--- THIS WAS MISSING

// --- 1. DATE & CYCLE LOGIC ---

export function getNextWorkingDay(date: Date): Date {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  const newDate = new Date(date);

  if (day === 6)
    newDate.setDate(date.getDate() + 2); // Sat -> Mon
  else if (day === 0) newDate.setDate(date.getDate() + 1); // Sun -> Mon

  return newDate;
}

/**
 * Returns the official START date of a cycle for a given Year/Month.
 * - Standard: 25th (or next working day)
 * - December: 19th (or next working day) - Special user rule
 */
export function getCycleStartDate(year: number, monthIndex: number): Date {
  const d = new Date(Date.UTC(year, monthIndex, 1));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();

  let baseDay = 25;
  if (m === 11) baseDay = 19; // December rule

  const tentative = new Date(Date.UTC(y, m, baseDay));
  return getNextWorkingDay(tentative);
}

/**
 * Determines which "Cycle Month" a specific date belongs to.
 */
export function getCycleKeyForDate(dateObj: Date): string {
  const y = dateObj.getUTCFullYear();
  const m = dateObj.getUTCMonth();

  const startOfThisMonthCycle = getCycleStartDate(y, m);

  if (dateObj >= startOfThisMonthCycle) {
    const d = new Date(Date.UTC(y, m + 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  } else {
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
}

export function getCurrentCycle() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const startOfThis = getCycleStartDate(y, m);

  let start: Date;
  let end: Date;

  if (now >= startOfThis) {
    start = startOfThis;
    const startOfNext = getCycleStartDate(y, m + 1);
    end = new Date(startOfNext);
    end.setDate(end.getDate() - 1);
  } else {
    const startOfPrev = getCycleStartDate(y, m - 1);
    start = startOfPrev;
    end = new Date(startOfThis);
    end.setDate(end.getDate() - 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// --- NEW: ASYNC CYCLE FETCHING (DB AWARE) ---

export async function fetchCurrentCycle() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const now = new Date();

  // 1. Get the "Default" calculated cycle to find the Key
  const defaultCycle = getCurrentCycle();
  const cycleKey = getCycleKeyForDate(now);

  // 2. Try to find a custom override in DB
  const { data: customCycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("key", cycleKey)
    .single();

  if (customCycle) {
    const start = new Date(customCycle.start_date);
    const end = new Date(customCycle.end_date);

    // Ensure hours are set for comparison safety
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
      start,
      end,
      key: cycleKey,
    };
  }

  // 3. Fallback to default calculation
  return {
    ...defaultCycle,
    key: cycleKey,
  };
}

// --- 2. CURRENCY LOGIC ---

export type RatesByDay = Record<string, Record<string, number>>;

interface ExchangeRateResponse {
  rates: RatesByDay;
}

export async function fetchCycleRates(
  startDate: Date,
  endDate: Date,
  toCurrency: string,
) {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const url = `https://api.frankfurter.dev/v1/${startStr}..${endStr}?to=${encodeURIComponent(
    toCurrency,
  )}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data: ExchangeRateResponse = await res.json();
    return data.rates;
  } catch (err) {
    console.error("Failed to fetch rates:", err);
    return null;
  }
}

export function getRateForDay(
  rates: RatesByDay,
  date: Date,
  toCurrency: string,
) {
  const d = new Date(date);
  for (let i = 0; i < 10; i++) {
    const key = d.toISOString().slice(0, 10);
    const rate = rates?.[key]?.[toCurrency];
    if (typeof rate === "number") return rate;
    d.setDate(d.getDate() - 1);
  }
  return null;
}

export function convertToEur(params: {
  amount: number;
  fromCurrency: string;
  rateFromPerEur: number;
}) {
  const { amount, fromCurrency, rateFromPerEur } = params;
  if (fromCurrency === "EUR") return amount;
  return amount / rateFromPerEur;
}

export function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}

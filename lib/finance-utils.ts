// lib/finance-utils.ts
import { createClient } from "@supabase/supabase-js";

// --- 1. DATE & CYCLE LOGIC ---

export function getNextWorkingDay(date: Date): Date {
  const day = date.getUTCDay();
  const newDate = new Date(date);

  if (day === 6)
    newDate.setUTCDate(date.getUTCDate() + 2); // Sat -> Mon
  else if (day === 0) newDate.setUTCDate(date.getUTCDate() + 1); // Sun -> Mon

  return newDate;
}

/**
 * STANDARD (Default) Rule:
 * - Starts 25th of previous month.
 * - Dec Exception: Starts 19th.
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
 * STANDARD (Default) Key Calculation
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

/**
 * NEW: SMART Key Calculation (Checks Custom Cycles First)
 */
export function getSmartCycleKey(dateObj: Date, customCycles: any[]): string {
  const dateStr = dateObj.toISOString().split("T")[0];

  // 1. Check if date falls inside a known custom cycle
  const match = customCycles?.find((c) => {
    return dateStr >= c.start_date && dateStr <= c.end_date;
  });

  if (match) return match.key;

  // 2. Fallback to standard
  return getCycleKeyForDate(dateObj);
}

export function getCurrentCycle() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const startOfThis = getCycleStartDate(y, m);

  let start: Date;
  let end: Date;

  if (now >= startOfThis) {
    start = startOfThis;
    const startOfNext = getCycleStartDate(y, m + 1);
    end = new Date(startOfNext);
    end.setUTCDate(end.getUTCDate() - 1);
  } else {
    const startOfPrev = getCycleStartDate(y, m - 1);
    start = startOfPrev;
    end = new Date(startOfThis);
    end.setUTCDate(end.getUTCDate() - 1);
  }

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

// --- UPDATED: DB-AWARE FETCH ---

export async function fetchCurrentCycle() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const now = new Date();
  const nowStr = now.toISOString().split("T")[0];

  // 1. Try to find a custom cycle that explicitly contains "today"
  const { data: activeCycle } = await supabase
    .from("cycles")
    .select("*")
    .lte("start_date", nowStr)
    .gte("end_date", nowStr)
    .maybeSingle();

  if (activeCycle) {
    const start = new Date(activeCycle.start_date);
    const end = new Date(activeCycle.end_date);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end, key: activeCycle.key };
  }

  // 2. Fallback to default
  const defaultCycle = getCurrentCycle();
  const cycleKey = getCycleKeyForDate(now);

  return { ...defaultCycle, key: cycleKey };
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

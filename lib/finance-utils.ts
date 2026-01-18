// lib/finance-utils.ts

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
  // Handle month rollover (e.g. month 12 -> Jan next year) if necessary
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
 * Returns a key like "2026-01" for the cycle that COVERS January expenses.
 * (Usually starts Dec 25th of previous year).
 */
export function getCycleKeyForDate(dateObj: Date): string {
  const y = dateObj.getUTCFullYear();
  const m = dateObj.getUTCMonth();

  // Calculate the start of the cycle for THIS month
  const startOfThisMonthCycle = getCycleStartDate(y, m);

  if (dateObj >= startOfThisMonthCycle) {
    // If we passed the 25th, we are in NEXT month's cycle
    // e.g. Jan 26 is part of "Feb" cycle
    const d = new Date(Date.UTC(y, m + 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  } else {
    // We are before the 25th, so we are still in THIS month's cycle
    // (Wait, actually usually:
    //  Dec 25 -> Jan 24 is the "Jan" cycle.
    //  Jan 10 is inside "Jan" cycle.
    //  So if date < Jan 25, we are in Jan cycle?
    //  Let's trace:
    //  Cycle Starts Dec 25.
    //  Date Jan 10.
    //  Start(Jan) = Jan 25.
    //  Jan 10 < Jan 25. So it belongs to... "Jan" cycle?
    //  Yes.
    //  Date Jan 26.
    //  Jan 26 >= Jan 25. It belongs to "Feb" cycle.

    // So:
    // If date < Start(ThisMonth), it is This Month Cycle.
    // If date >= Start(ThisMonth), it is Next Month Cycle.

    // Example: Jan 10. Start(Jan) = Jan 25. 10 < 25 -> Key "2026-01". Correct.
    // Example: Jan 26. Start(Jan) = Jan 25. 26 >= 25 -> Key "2026-02". Correct.

    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
}

export function getCurrentCycle() {
  const now = new Date();

  // Find which cycle we are in right now
  const y = now.getFullYear();
  const m = now.getMonth();

  const startOfThis = getCycleStartDate(y, m);

  let start: Date;
  let end: Date;

  if (now >= startOfThis) {
    // We are in the "Next Month" cycle
    start = startOfThis;
    const startOfNext = getCycleStartDate(y, m + 1);
    end = new Date(startOfNext);
    end.setDate(end.getDate() - 1);
  } else {
    // We are in "This Month" cycle (which started last month)
    const startOfPrev = getCycleStartDate(y, m - 1);
    start = startOfPrev;

    end = new Date(startOfThis);
    end.setDate(end.getDate() - 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
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

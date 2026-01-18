// lib/finance-utils.ts

// --- 1. DATE & CYCLE LOGIC ---

function getNextWorkingDay(date: Date): Date {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  const newDate = new Date(date);

  if (day === 6) newDate.setDate(date.getDate() + 2);
  else if (day === 0) newDate.setDate(date.getDate() + 1);

  return newDate;
}

export function getCurrentCycle() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const tentativeStartThisMonth = new Date(currentYear, currentMonth, 25);
  const actualStartThisMonth = getNextWorkingDay(tentativeStartThisMonth);

  let start: Date;
  let end: Date;

  if (now >= actualStartThisMonth) {
    start = actualStartThisMonth;

    const tentativeStartNextMonth = new Date(currentYear, currentMonth + 1, 25);
    const actualStartNextMonth = getNextWorkingDay(tentativeStartNextMonth);

    end = new Date(actualStartNextMonth);
    end.setDate(actualStartNextMonth.getDate() - 1);
  } else {
    const tentativeStartLastMonth = new Date(currentYear, currentMonth - 1, 25);
    const actualStartLastMonth = getNextWorkingDay(tentativeStartLastMonth);

    start = actualStartLastMonth;

    end = new Date(actualStartThisMonth);
    end.setDate(actualStartThisMonth.getDate() - 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// --- 2. CURRENCY LOGIC ---

export type RatesByDay = Record<string, Record<string, number>>;

interface ExchangeRateResponse {
  rates: RatesByDay; // { "2024-01-01": { "BRL": 5.35 } }
}

/**
 * Fetches daily rates for EUR(base) -> toCurrency for the entire date range.
 * Frankfurter base is EUR by default.
 */
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

/**
 * Returns a rate for a given day; if missing (weekend/holiday),
 * walks back up to 10 days to find the previous available rate.
 */
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

/**
 * Convert an amount in `fromCurrency` to EUR, given a Frankfurter rate:
 * rateFromPerEur = (fromCurrency per 1 EUR).
 * Example: if 1 EUR = 5 BRL, rateFromPerEur = 5
 * then 100 BRL => 100 / 5 = 20 EUR.
 */
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

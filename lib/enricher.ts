// lib/enricher.ts
import { NormalizedTransaction } from "./adapters/types";

// 2. CURRENCY CONVERSION (Batch)
export async function fetchRatesForBatch(
  transactions: NormalizedTransaction[],
) {
  // Find date range
  const dates = transactions.map((t) => new Date(t.date).getTime());
  if (dates.length === 0) return {};

  const minDate = new Date(Math.min(...dates)).toISOString().split("T")[0];
  const maxDate = new Date(Math.max(...dates)).toISOString().split("T")[0];

  // Fetch BRL rates for this range (Base: EUR)
  // We assume transactions are either EUR or BRL for simplicity
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/${minDate}..${maxDate}?to=BRL`,
    );
    const data = await res.json();
    return data.rates || {}; // { "2024-01-01": { "BRL": 5.35 } }
  } catch (err) {
    console.error("Rate fetch failed, using fallback 6.0", err);
    return {};
  }
}

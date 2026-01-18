// lib/enricher.ts
import { NormalizedTransaction } from "./adapters/types";

// 1. YOUR CATEGORY RULES
// Add your own keywords here. Order matters (first match wins).
const RULES: Record<string, string[]> = {
  Groceries: ["rewe", "lidl", "aldi", "edeka", "market", "kaufland"],
  Transport: ["uber", "bolt", "bvg", "db vertrieb", "shell", "aral"],
  "Eating Out": ["restaurant", "burger", "mcdonalds", "wolt", "lieferando"],
  Housing: ["rent", "housing", "stadtwerke", "vattenfall"],
  Salary: ["salary", "payroll", "employer"],
  Shopping: ["amazon", "paypal", "zalando", "klarna"],
  Travel: ["airbnb", "booking.com", "lufthansa", "ryanair", "hotel"],
  Investments: ["trade republic", "scalable", "vanguard"],
};

export function predictCategory(
  description: string,
  bankCategory: string
): string {
  const lowerDesc = description.toLowerCase();

  // 1. Check our custom rules
  for (const [category, keywords] of Object.entries(RULES)) {
    if (keywords.some((k) => lowerDesc.includes(k))) {
      return category;
    }
  }

  // 2. Fallback: If bank category is specific, keep it. If generic, mark as Uncategorized.
  const uselessCategories = [
    "transfer",
    "card payment",
    "loan_payment",
    "credit card",
    "checking",
  ];
  if (uselessCategories.includes(bankCategory.toLowerCase())) {
    return "Uncategorized"; // Forces you to look at it later
  }

  return bankCategory;
}

// 2. CURRENCY CONVERSION (Batch)
export async function fetchRatesForBatch(
  transactions: NormalizedTransaction[]
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
      `https://api.frankfurter.dev/v1/${minDate}..${maxDate}?to=BRL`
    );
    const data = await res.json();
    return data.rates || {}; // { "2024-01-01": { "BRL": 5.35 } }
  } catch (err) {
    console.error("Rate fetch failed, using fallback 6.0", err);
    return {};
  }
}

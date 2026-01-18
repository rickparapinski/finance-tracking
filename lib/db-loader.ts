// lib/db-loader.ts
import { createClient } from "@supabase/supabase-js";
import { NormalizedTransaction } from "./adapters/types";
import { fetchRatesForBatch } from "./enricher"; // keep FX helper for now

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type CategoryRuleRow = {
  category_id: string;
  pattern: string;
  is_case_sensitive: boolean;
  priority: number;
  categories: {
    name: string;
    is_active: boolean;
  } | null;
};

function txKey(date: string, amount: number, description: string) {
  // Normalize description to reduce false negatives due to spacing/case
  const d = (description || "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${date}|${amount}|${d}`;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function categorizeDescription(
  description: string,
  rules: CategoryRuleRow[],
): string | null {
  if (!description) return null;

  for (const r of rules) {
    if (!r.categories?.is_active) continue;

    const hay = r.is_case_sensitive ? description : description.toLowerCase();
    const needle = r.is_case_sensitive ? r.pattern : r.pattern.toLowerCase();

    if (hay.includes(needle)) return r.categories.name;
  }

  return null;
}

async function fetchActiveCategoryRules(): Promise<CategoryRuleRow[]> {
  // NOTE:
  // If your relationship name is not `categories`, Supabase might expose it as:
  // - `category` or something else depending on FK naming.
  // In that case, change `categories(...)` below to the relation name.
  const { data, error } = await supabase
    .from("category_rules")
    .select(
      "category_id, pattern, is_case_sensitive, priority, is_active, categories(name, is_active)",
    )
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error) throw new Error(error.message);

  return (data as any as CategoryRuleRow[]) || [];
}

export async function saveTransactions(
  accountId: string,
  transactions: NormalizedTransaction[],
) {
  let savedCount = 0;
  let duplicateCount = 0;

  // 1) Pre-fetch exchange rates for this batch
  const ratesMap = await fetchRatesForBatch(transactions);

  // 2) Fetch category rules once (fast)
  const rules = await fetchActiveCategoryRules();

  // 3) Prepare data for insertion
  const payload = transactions.map((trans) => {
    // A) Categorize using rules (description-only)
    // If adapter already provided a category, keep it.
    const existingCategory =
      trans.category && String(trans.category).trim().length > 0
        ? String(trans.category).trim()
        : null;

    const ruleCategory =
      existingCategory ?? categorizeDescription(trans.description, rules);

    const finalCategory = ruleCategory ?? "Uncategorized";

    // B) Calculate EUR Amount
    let amountInEur = trans.amount;

    if (trans.currency === "BRL") {
      const dateKey = trans.date; // "YYYY-MM-DD"
      const rate = ratesMap[dateKey]?.BRL || 6.0;
      amountInEur = trans.amount / rate;
    }

    return {
      account_id: accountId,
      date: trans.date,
      amount: trans.amount, // Original Amount
      amount_eur: amountInEur, // Normalized Amount
      description: trans.description,
      category: finalCategory,
      original_currency: trans.currency,
      is_manual: false,
    };
  });

  // 4) Fast duplicate detection (single query) + bulk insert

  // Determine date range of this import batch
  const dates = payload.map((p) => p.date).sort(); // YYYY-MM-DD sorts lexicographically fine
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  // Fetch existing rows only in this date range for this account
  const { data: existingRows, error: existingErr } = await supabase
    .from("transactions")
    .select("date, amount, description")
    .eq("account_id", accountId)
    .gte("date", minDate)
    .lte("date", maxDate);

  if (existingErr) throw new Error(existingErr.message);

  const existingSet = new Set<string>();
  (existingRows || []).forEach((r: any) => {
    existingSet.add(txKey(r.date, Number(r.amount), String(r.description)));
  });

  const newRows = [];
  for (const row of payload) {
    const key = txKey(row.date, Number(row.amount), String(row.description));
    if (existingSet.has(key)) duplicateCount++;
    else {
      newRows.push(row);
      existingSet.add(key); // also dedupe within the imported file itself
    }
  }

  if (newRows.length === 0) {
    return { savedCount: 0, duplicateCount };
  }

  // Bulk insert in chunks (safe for large imports)
  for (const part of chunk(newRows, 500)) {
    const { error } = await supabase.from("transactions").insert(part);
    if (error) throw new Error(error.message);
    savedCount += part.length;
  }

  return { savedCount, duplicateCount };
}

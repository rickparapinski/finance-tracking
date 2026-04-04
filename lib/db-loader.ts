// lib/db-loader.ts
import { sql } from "@/lib/db";
import { NormalizedTransaction } from "./adapters/types";
import { fetchRatesForBatch } from "./enricher";

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
  const rows = await sql`
    SELECT
      cr.category_id,
      cr.pattern,
      cr.is_case_sensitive,
      cr.priority,
      cr.is_active,
      json_build_object('name', c.name, 'is_active', c.is_active) AS categories
    FROM category_rules cr
    LEFT JOIN categories c ON cr.category_id = c.id
    WHERE cr.is_active = true
    ORDER BY cr.priority ASC
  `;
  return rows as unknown as CategoryRuleRow[];
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
    const existingCategory =
      trans.category && String(trans.category).trim().length > 0
        ? String(trans.category).trim()
        : null;

    const ruleCategory =
      existingCategory ?? categorizeDescription(trans.description, rules);

    const finalCategory = ruleCategory ?? "Uncategorized";

    let amountInEur = trans.amount;

    if (trans.currency === "BRL") {
      const dateKey = trans.date;
      const rate = ratesMap[dateKey]?.BRL || 6.0;
      amountInEur = trans.amount / rate;
    }

    return {
      account_id: accountId,
      date: trans.date,
      amount: trans.amount,
      amount_eur: amountInEur,
      description: trans.description,
      category: finalCategory,
      original_currency: trans.currency,
      is_manual: false,
    };
  });

  // 4) Fast duplicate detection (single query) + bulk insert
  const dates = payload.map((p) => p.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const existingRows = await sql`
    SELECT date, amount, description
    FROM transactions
    WHERE account_id = ${accountId}
      AND date >= ${minDate}
      AND date <= ${maxDate}
  `;

  const existingSet = new Set<string>();
  existingRows.forEach((r: any) => {
    existingSet.add(txKey(r.date, Number(r.amount), String(r.description)));
  });

  const newRows = [];
  for (const row of payload) {
    const key = txKey(row.date, Number(row.amount), String(row.description));
    if (existingSet.has(key)) duplicateCount++;
    else {
      newRows.push(row);
      existingSet.add(key);
    }
  }

  if (newRows.length === 0) {
    return { savedCount: 0, duplicateCount };
  }

  // Bulk insert in chunks
  for (const part of chunk(newRows, 500)) {
    await sql`INSERT INTO transactions ${sql(part)}`;
    savedCount += part.length;
  }

  return { savedCount, duplicateCount };
}

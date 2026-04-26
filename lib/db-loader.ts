"use server";
// lib/db-loader.ts
import { sql } from "@/lib/db";
import { NormalizedTransaction } from "./adapters/types";
import { fetchRatesForBatch } from "./enricher";
import { parseInstallment, addMonthsISO } from "./installment";
import { tryAutoMatchForecast } from "./forecast-automatch";

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

async function createInstallmentForecasts(rows: {
  id: string;
  date: string;
  amount_eur: number | null;
  account_id: string;
  description: string;
  category: string;
  installment_index: number;
  installment_total: number;
}[]) {
  for (const row of rows) {
    const { id, date, amount_eur, account_id, description, category, installment_index, installment_total } = row;
    const remaining = installment_total - installment_index;
    if (remaining <= 0) continue;

    const amount = amount_eur ?? 0;
    const dom = new Date(date).getDate();
    const startDate = addMonthsISO(date, 1);
    const endDate = addMonthsISO(date, remaining);
    const ruleName = `Installments: ${description}`;

    const [rule] = await sql`
      INSERT INTO forecast_rules
        (source_transaction_id, account_id, name, type, category, amount, currency,
         start_date, end_date, frequency, day_of_month, installments_count, is_active)
      VALUES
        (${id}, ${account_id}, ${ruleName}, 'recurring', ${category}, ${amount}, 'EUR',
         ${startDate}, ${endDate}, 'monthly', ${dom}, ${remaining}, true)
      ON CONFLICT (source_transaction_id) DO UPDATE
        SET name = EXCLUDED.name, installments_count = EXCLUDED.installments_count,
            start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
      RETURNING id
    `;

    const instances = Array.from({ length: remaining }, (_, i) => ({
      rule_id: rule.id,
      date: addMonthsISO(date, i + 1),
      amount,
      status: "projected",
      transaction_id: null,
      note: `Installment ${installment_index + i + 1}/${installment_total}`,
    }));

    await sql`
      INSERT INTO forecast_instances ${sql(instances)}
      ON CONFLICT (rule_id, date) DO NOTHING
    `;
  }
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

    const installment = parseInstallment(trans.description);

    return {
      account_id: accountId,
      date: trans.date,
      amount: trans.amount,
      amount_eur: amountInEur,
      description: trans.description,
      category: finalCategory,
      original_currency: trans.currency,
      is_manual: false,
      installment_index: installment?.index ?? null,
      installment_total: installment?.total ?? null,
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

  // Bulk insert in chunks, collecting inserted rows for installment processing
  const insertedWithInstallments: any[] = [];
  const allInsertedRows: any[] = [];

  for (const part of chunk(newRows, 500)) {
    const inserted = await sql`
      INSERT INTO transactions ${sql(part)}
      RETURNING id, date, amount_eur, account_id, description, category,
                installment_index, installment_total
    `;
    savedCount += inserted.length;

    for (const r of inserted) {
      allInsertedRows.push(r);
      if (r.installment_index != null && r.installment_total != null) {
        insertedWithInstallments.push(r);
      }
    }
  }

  // Create forecasts for incomplete installment series
  if (insertedWithInstallments.length > 0) {
    await createInstallmentForecasts(insertedWithInstallments);
  }

  // Auto-match inserted transactions to projected forecast instances
  for (const row of allInsertedRows) {
    await tryAutoMatchForecast(String(row.id));
  }

  return { savedCount, duplicateCount };
}

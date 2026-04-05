"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

async function syncBudgetRule(
  categoryId: string,
  name: string,
  type: string,
  budget: number,
) {
  if (!budget || budget <= 0) {
    const [existing] = await sql`
      SELECT id FROM forecast_rules
      WHERE category_id = ${categoryId} AND type = 'budget'
    `;

    if (existing) {
      await sql`DELETE FROM forecast_instances WHERE rule_id = ${existing.id} AND status = 'projected'`;
      await sql`DELETE FROM forecast_rules WHERE id = ${existing.id}`;
    }
    return;
  }

  const finalAmount = type === "expense" ? -Math.abs(budget) : Math.abs(budget);

  const [existing] = await sql`
    SELECT id FROM forecast_rules
    WHERE category_id = ${categoryId} AND type = 'budget'
  `;

  if (existing) {
    await sql`
      UPDATE forecast_rules
      SET name = ${"Budget: " + name}, category = ${name}, amount = ${finalAmount}, is_active = true
      WHERE id = ${existing.id}
    `;
    await sql`
      UPDATE forecast_instances
      SET amount = ${finalAmount}
      WHERE rule_id = ${existing.id} AND status = 'projected'
    `;
  } else {
    const [acc] = await sql`SELECT id FROM accounts LIMIT 1`;

    if (!acc) throw new Error("You must have at least one account created to add a budget.");

    await sql`
      INSERT INTO forecast_rules
        (account_id, category_id, name, type, category, amount, currency, start_date, frequency, day_of_month, is_active)
      VALUES
        (${acc.id}, ${categoryId}, ${"Budget: " + name}, 'budget', ${name}, ${finalAmount},
         'EUR', ${new Date().toISOString().slice(0, 10)}, 'monthly', 1, true)
    `;
  }
}

export async function getSpendingForCycle(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const rows = await sql`
    SELECT category, SUM(ABS(amount_eur)) AS total
    FROM transactions
    WHERE date >= ${startDate} AND date <= ${endDate} AND amount < 0
    GROUP BY category
  `;
  return Object.fromEntries(rows.map((r: any) => [r.category, Number(r.total)]));
}

export async function getCategoryTransactions(
  categoryName: string,
  startDate: string,
  endDate: string,
) {
  return await sql`
    SELECT t.*, json_build_object('name', a.name) AS accounts
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.category = ${categoryName}
      AND t.date >= ${startDate} AND t.date <= ${endDate}
    ORDER BY t.date DESC
  `;
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "expense");
  const color = String(formData.get("color") || "").trim() || null;
  const budget = parseFloat(String(formData.get("monthly_budget") || "0"));

  if (!name) throw new Error("Category name is required");

  const [data] = await sql`
    INSERT INTO categories (name, type, color, monthly_budget)
    VALUES (${name}, ${type}, ${color}, ${budget})
    RETURNING id
  `;

  await syncBudgetRule(data.id, name, type, budget);

  revalidatePath("/categories");
}

export async function updateCategory(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "expense");
  const color = String(formData.get("color") || "").trim() || null;
  const is_active = formData.get("is_active") === "on";
  const budget = parseFloat(String(formData.get("monthly_budget") || "0"));

  if (!id) throw new Error("Missing category id");

  await sql`
    UPDATE categories
    SET name = ${name}, type = ${type}, color = ${color}, is_active = ${is_active}, monthly_budget = ${budget}
    WHERE id = ${id}
  `;

  await syncBudgetRule(id, name, type, is_active ? budget : 0);

  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  await sql`DELETE FROM forecast_rules WHERE category_id = ${id}`;
  await sql`DELETE FROM categories WHERE id = ${id}`;
  revalidatePath("/categories");
}

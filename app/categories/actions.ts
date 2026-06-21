"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { toSlug } from "@/lib/slug";

export async function getSpendingForCycle(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const rows = await sql`
    SELECT category, SUM(amount_eur) AS total
    FROM transactions
    WHERE date >= ${startDate} AND date <= ${endDate}
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
  const slug = toSlug(name);

  if (!name) throw new Error("Category name is required");

  const [data] = await sql`
    INSERT INTO categories (name, type, color, monthly_budget, slug)
    VALUES (${name}, ${type}, ${color}, ${budget}, ${slug})
    RETURNING id
  `;

  revalidatePath("/categories");
}

export async function updateCategory(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "expense");
  const color = String(formData.get("color") || "").trim() || null;
  const is_active = formData.get("is_active") === "on";
  const budget = parseFloat(String(formData.get("monthly_budget") || "0"));
  const slug = toSlug(name);

  if (!id) throw new Error("Missing category id");

  const [updated] = await sql`
    UPDATE categories
    SET name = ${name}, type = ${type}, color = ${color}, is_active = ${is_active},
        monthly_budget = ${budget}, slug = ${slug}
    WHERE id = ${id}
    RETURNING slug
  `;

  revalidatePath("/categories");
  if (updated?.slug) revalidatePath(`/categories/${updated.slug}`);
}

export async function deleteCategory(id: string) {
  await sql`DELETE FROM forecast_rules WHERE category_id = ${id}`;
  await sql`DELETE FROM categories WHERE id = ${id}`;
  revalidatePath("/categories");
}

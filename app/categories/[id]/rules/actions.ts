"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

export async function createRule(formData: FormData) {
  const categoryId = String(
    formData.get("category_id") ?? formData.get("categoryId") ?? "",
  ).trim();
  const pattern = String(formData.get("pattern") || "").trim();
  const priorityRaw = String(formData.get("priority") || "100");
  const priority = Number(priorityRaw);
  const applyExisting = formData.get("apply_existing") === "on";

  if (!categoryId) throw new Error("Missing category_id");
  if (!pattern) throw new Error("Pattern is required");

  await sql`
    INSERT INTO category_rules (category_id, match_type, pattern, priority, is_case_sensitive, is_active)
    VALUES (${categoryId}, 'contains', ${pattern}, ${Number.isFinite(priority) ? priority : 100}, false, true)
  `;

  if (applyExisting) {
    const [cat] = await sql`SELECT name FROM categories WHERE id = ${categoryId}`;

    if (cat?.name) {
      await sql`
        UPDATE transactions
        SET category = ${cat.name}
        WHERE category = 'Uncategorized' AND description ILIKE ${"%" + pattern + "%"}
      `;
    }
  }

  revalidatePath(`/categories/${categoryId}/rules`);
  revalidatePath("/transactions");
}

export async function updateRule(formData: FormData) {
  const categoryId = String(
    formData.get("category_id") ?? formData.get("categoryId") ?? "",
  ).trim();
  const id = String(formData.get("id") || "").trim();
  const pattern = String(formData.get("pattern") || "").trim();
  const priorityRaw = String(formData.get("priority") || "100");
  const priority = Number(priorityRaw);
  const is_active = formData.get("is_active") === "on";

  if (!categoryId) throw new Error("Missing category_id");
  if (!id) throw new Error("Missing rule id");
  if (!pattern) throw new Error("Pattern is required");

  await sql`
    UPDATE category_rules
    SET pattern = ${pattern}, priority = ${Number.isFinite(priority) ? priority : 100}, is_active = ${is_active}
    WHERE id = ${id}
  `;

  revalidatePath(`/categories/${categoryId}/rules`);
}

export async function deleteRule(formData: FormData) {
  const categoryId = String(
    formData.get("category_id") ?? formData.get("categoryId") ?? "",
  ).trim();
  const id = String(formData.get("id") || "").trim();

  if (!categoryId) throw new Error("Missing category_id");
  if (!id) throw new Error("Missing rule id");

  await sql`DELETE FROM category_rules WHERE id = ${id}`;

  revalidatePath(`/categories/${categoryId}/rules`);
}

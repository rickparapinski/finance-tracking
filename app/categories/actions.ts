"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function syncBudgetRule(
  categoryId: string,
  name: string,
  budget: number,
) {
  // 1. If budget is 0 or negative, remove any existing budget rule
  if (!budget || budget <= 0) {
    await supabase
      .from("forecast_rules")
      .delete()
      .eq("category_id", categoryId)
      .eq("type", "budget");
    return;
  }

  // 2. Upsert the Budget Rule
  // We use a specific ID based on category to prevent duplicates (or rely on category_id)
  const { error } = await supabase.from("forecast_rules").upsert(
    {
      category_id: categoryId, // Strict link
      name: `Budget: ${name}`,
      type: "budget", // New type
      category: name, // String fallback for display
      amount: budget,
      currency: "EUR", // Defaulting to EUR for simplicity
      start_date: new Date().toISOString().slice(0, 10), // Starts now
      frequency: "monthly",
      day_of_month: 1, // Budgets usually start on the 1st
      is_active: true,
    },
    { onConflict: "category_id, type" }, // Requires a unique index on (category_id, type) or just manage via ID query
  );

  // Note: To make the upsert work perfectly, ideally add a UNIQUE index:
  // CREATE UNIQUE INDEX idx_forecast_budget ON forecast_rules(category_id, type) WHERE type = 'budget';
  // For now, we can also just Query -> Update/Insert manually if index is missing.
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "expense");
  const color = String(formData.get("color") || "").trim() || null;
  const budget = parseFloat(String(formData.get("monthly_budget") || "0"));

  if (!name) throw new Error("Category name is required");

  // 1. Insert Category
  const { data, error } = await supabase
    .from("categories")
    .insert([{ name, type, color, monthly_budget: budget }])
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // 2. Sync Forecast Rule
  await syncBudgetRule(data.id, name, budget);

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

  const { error } = await supabase
    .from("categories")
    .update({ name, type, color, is_active, monthly_budget: budget })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Sync Forecast Rule
  if (is_active) {
    await syncBudgetRule(id, name, budget);
  } else {
    // If inactive, delete the rule
    await syncBudgetRule(id, name, 0);
  }

  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}

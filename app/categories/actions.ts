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
  type: string,
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

  // 2. Logic: Expenses should be negative for the forecast math
  const finalAmount = type === "expense" ? -Math.abs(budget) : Math.abs(budget);

  // 3. Robust Upsert (Check existence manually)
  const { data: existing } = await supabase
    .from("forecast_rules")
    .select("id")
    .eq("category_id", categoryId)
    .eq("type", "budget")
    .single();

  if (existing) {
    // UPDATE existing rule (Account ID already exists, so we don't need to touch it)
    const { error } = await supabase
      .from("forecast_rules")
      .update({
        name: `Budget: ${name}`,
        category: name,
        amount: finalAmount,
        is_active: true,
      })
      .eq("id", existing.id);

    if (error) throw new Error(`Failed to update rule: ${error.message}`);
  } else {
    // INSERT new rule
    // FIX: The DB requires an account_id. Since budgets are global,
    // we pick the first available account to satisfy the constraint.
    const { data: acc } = await supabase
      .from("accounts")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!acc) {
      throw new Error(
        "You must have at least one account created to add a budget.",
      );
    }

    const { error } = await supabase.from("forecast_rules").insert({
      account_id: acc.id, // <--- Added this to fix the error
      category_id: categoryId,
      name: `Budget: ${name}`,
      type: "budget",
      category: name,
      amount: finalAmount,
      currency: "EUR",
      start_date: new Date().toISOString().slice(0, 10),
      frequency: "monthly",
      day_of_month: 1,
      is_active: true,
    });

    if (error) throw new Error(`Failed to create rule: ${error.message}`);
  }
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

  const { error } = await supabase
    .from("categories")
    .update({ name, type, color, is_active, monthly_budget: budget })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Sync Forecast Rule
  if (is_active) {
    await syncBudgetRule(id, name, type, budget);
  } else {
    // If inactive, delete the rule
    await syncBudgetRule(id, name, type, 0);
  }

  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  // Optional: Trigger delete on forecast_rules too if you don't have ON DELETE CASCADE
  await supabase.from("forecast_rules").delete().eq("category_id", id);

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}

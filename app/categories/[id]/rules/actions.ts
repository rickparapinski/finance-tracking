"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function createRule(formData: FormData) {
  const categoryId = String(
    formData.get("category_id") ?? formData.get("categoryId") ?? "",
  ).trim();
  const pattern = String(formData.get("pattern") || "").trim();
  const priorityRaw = String(formData.get("priority") || "100");
  const priority = Number(priorityRaw);

  if (!categoryId) throw new Error("Missing category_id");
  if (!pattern) throw new Error("Pattern is required");

  const { error } = await supabase.from("category_rules").insert([
    {
      category_id: categoryId,
      match_type: "contains",
      pattern,
      priority: Number.isFinite(priority) ? priority : 100,
      is_case_sensitive: false,
      is_active: true,
    },
  ]);

  if (error) throw new Error(error.message);

  revalidatePath(`/categories/${categoryId}/rules`);
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

  const { error } = await supabase
    .from("category_rules")
    .update({
      pattern,
      priority: Number.isFinite(priority) ? priority : 100,
      is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/categories/${categoryId}/rules`);
}

export async function deleteRule(formData: FormData) {
  const categoryId = String(
    formData.get("category_id") ?? formData.get("categoryId") ?? "",
  ).trim();
  const id = String(formData.get("id") || "").trim();

  if (!categoryId) throw new Error("Missing category_id");
  if (!id) throw new Error("Missing rule id");

  const { error } = await supabase.from("category_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/categories/${categoryId}/rules`);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "expense");
  const color = String(formData.get("color") || "").trim() || null;

  if (!name) throw new Error("Category name is required");

  const { error } = await supabase
    .from("categories")
    .insert([{ name, type, color }]);
  if (error) throw new Error(error.message);

  revalidatePath("/categories");
}

export async function updateCategory(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "expense");
  const color = String(formData.get("color") || "").trim() || null;
  const is_active = formData.get("is_active") === "on";

  if (!id) throw new Error("Missing category id");

  const { error } = await supabase
    .from("categories")
    .update({ name, type, color, is_active })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/categories");
}

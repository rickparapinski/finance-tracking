// app/accounts/actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// 1. Define the Map (Single Source of Truth)
const ACCOUNT_TYPES: Record<string, "asset" | "liability"> = {
  Checking: "asset",
  Savings: "asset",
  Investment: "asset",
  "Credit Card": "liability",
  Loan: "liability",
};

export async function upsertAccount(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  const name = (formData.get("name") as string) || "";
  const currency = (formData.get("currency") as string) || "EUR";

  // 2. Get Type and Enforce Nature
  const rawType = (formData.get("type") as string) || "Checking";

  // Ensure we use valid keys from our map, fallback to Checking
  const type = Object.keys(ACCOUNT_TYPES).includes(rawType)
    ? rawType
    : "Checking";
  const nature = ACCOUNT_TYPES[type];

  const initial_balance =
    parseFloat((formData.get("initial_balance") as string) || "0") || 0;

  const payload = {
    name,
    currency,
    type,
    nature, // <--- Automatically set
    initial_balance,
  };

  const { error } = id
    ? await supabase.from("accounts").update(payload).eq("id", id)
    : await supabase.from("accounts").insert(payload);

  if (error) {
    console.error("Error saving account:", error);
    throw new Error("Failed to save account");
  }

  revalidatePath("/accounts");
  revalidatePath("/");
}

// ... archiveAccount and restoreAccount remain the same
export async function archiveAccount(id: string) {
  const { error } = await supabase
    .from("accounts")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw new Error("Failed to archive");
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function restoreAccount(id: string) {
  const { error } = await supabase
    .from("accounts")
    .update({ status: "active" })
    .eq("id", id);
  if (error) throw new Error("Failed to restore");
  revalidatePath("/accounts");
  revalidatePath("/");
}

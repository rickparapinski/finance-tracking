"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function upsertAccount(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  const name = (formData.get("name") as string) || "";
  const currency = (formData.get("currency") as string) || "EUR";
  const type = (formData.get("type") as string) || "Checking";
  const initial_balance =
    parseFloat((formData.get("initial_balance") as string) || "0") || 0;

  const payload = { name, currency, type, initial_balance };

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

export async function archiveAccount(id: string) {
  const { error } = await supabase
    .from("accounts")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) {
    console.error("Error archiving account:", error);
    throw new Error("Failed to archive account");
  }

  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function restoreAccount(id: string) {
  const { error } = await supabase
    .from("accounts")
    .update({ status: "active" })
    .eq("id", id);

  if (error) {
    console.error("Error restoring account:", error);
    throw new Error("Failed to restore account");
  }

  revalidatePath("/accounts");
  revalidatePath("/");
}

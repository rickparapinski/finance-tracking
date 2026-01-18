"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  getCurrentCycle,
  fetchCycleRates,
  getRateForDay,
  convertToEur,
} from "@/lib/finance-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function createTransaction(formData: FormData) {
  const account_id = String(formData.get("account_id") || "");
  const dateStr = String(formData.get("date") || "");
  const description = String(formData.get("description") || "");
  const category = String(formData.get("category") || "Uncategorized");
  const amountRaw = String(formData.get("amount") || "0");

  if (!account_id) throw new Error("Missing account_id");
  if (!dateStr) throw new Error("Missing date");
  if (!description) throw new Error("Missing description");

  const amount = Number(amountRaw);
  if (Number.isNaN(amount)) throw new Error("Invalid amount");

  // Load account currency (source of truth)
  const { data: acc, error: accErr } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", account_id)
    .single();

  if (accErr || !acc?.currency) {
    console.error("Account currency fetch failed:", accErr);
    throw new Error("Failed to load account currency");
  }

  const original_currency = acc.currency;

  // Compute amount_eur (always filled)
  let amount_eur = amount;

  if (original_currency !== "EUR") {
    const { start, end } = getCurrentCycle();
    const rates = await fetchCycleRates(start, end, original_currency);

    if (rates) {
      const rateFromPerEur = getRateForDay(
        rates,
        new Date(dateStr),
        original_currency,
      );

      if (rateFromPerEur) {
        amount_eur = Number(
          convertToEur({
            amount,
            fromCurrency: original_currency,
            rateFromPerEur,
          }).toFixed(2),
        );
      }
    }
  }

  const { error } = await supabase.from("transactions").insert({
    account_id,
    date: dateStr,
    description,
    category,
    amount,
    is_manual: true,
    original_currency,
    amount_eur,
  });

  if (error) {
    console.error("createTransaction error:", error);
    throw new Error("Failed to create transaction");
  }

  revalidatePath(`/accounts/${account_id}`);
  revalidatePath("/transactions");
}

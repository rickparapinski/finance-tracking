"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error("Failed to delete transaction");
  revalidatePath("/transactions");
}

export async function createManualTransaction(formData: FormData) {
  const account_id = formData.get("account_id") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const rawCategory = (formData.get("category") as string) ?? "";
  const category = rawCategory.trim() || "Uncategorized";

  // We need to fetch the account currency to set original_currency
  const { data: account } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", account_id)
    .single();

  if (!account) throw new Error("Account not found");

  const { error } = await supabase.from("transactions").insert({
    account_id,
    description,
    amount, // Negative for expense? User must input sign manually or UI handles it.
    date,
    category,
    original_currency: account.currency,
    is_manual: true,
    amount_eur: account.currency === "EUR" ? amount : null, // Basic fallback
  });

  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}
export async function updateTransaction(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const id = formData.get("id") as string;
  const date = formData.get("date") as string;
  const description = formData.get("description") as string;
  const rawCategory = (formData.get("category") as string) ?? "";
  const category = rawCategory.trim() || "Uncategorized";
  const newAmount = parseFloat(formData.get("amount") as string);

  // 1. Fetch the existing transaction to get currency info
  const { data: oldData } = await supabase
    .from("transactions")
    .select("amount, amount_eur")
    .eq("id", id)
    .single();

  if (!oldData) throw new Error("Transaction not found");

  // 2. Smart Recalculation of EUR
  // If amount changed, we preserve the original exchange rate
  let newAmountEur = oldData.amount_eur;

  if (newAmount !== oldData.amount) {
    // Calculate the implied rate from the original transaction
    // Rate = Local / EUR
    // Avoid division by zero
    if (oldData.amount_eur && oldData.amount_eur !== 0) {
      const impliedRate = oldData.amount / oldData.amount_eur;
      newAmountEur = newAmount / impliedRate;
    } else {
      newAmountEur = newAmount; // Fallback if 1:1 or broken
    }
  }

  // 3. Update
  const { error } = await supabase
    .from("transactions")
    .update({
      date,
      description,
      category,
      amount: newAmount,
      amount_eur: newAmountEur,
    })
    .eq("id", id);

  if (error) throw new Error("Update failed");

  revalidatePath("/transactions");
  revalidatePath("/"); // Update dashboard totals too
}

export async function bulkAssignCategory(ids: string[], category: string) {
  if (!ids?.length) return;

  const cleanCategory = (category ?? "").trim();
  if (!cleanCategory) throw new Error("Category is required");

  const { error } = await supabase
    .from("transactions")
    .update({ category: cleanCategory })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/"); // keep dashboard totals in sync (you already do this in updateTransaction)
}
export type TransactionLinkType =
  | "transfer"
  | "settlement"
  | "statement_payment"
  | "refund"
  | "allocation";

export async function createTransactionLink(args: {
  leftId: string;
  rightId: string;
  linkType: TransactionLinkType;
  amount?: number | null;
  note?: string | null;
}) {
  const { leftId, rightId, linkType, amount = null, note = null } = args;

  if (!leftId || !rightId) throw new Error("Two transaction IDs are required");
  if (leftId === rightId)
    throw new Error("Cannot link a transaction to itself");

  // 1. Fetch the transactions to check if we need to auto-balance
  const { data: txs } = await supabase
    .from("transactions")
    .select("id, amount, account_id, date, description, accounts(type)")
    .in("id", [leftId, rightId]);

  if (!txs || txs.length !== 2) throw new Error("Transactions not found");

  const [t1, t2] = txs;

  // 2. SMART LOGIC: Handle "Settlement" of Debt
  // If both are negative (Expense + Payment), we need a positive Credit to zero out the debt.
  if (linkType === "settlement" && t1.amount < 0 && t2.amount < 0) {
    // Heuristic: The transaction with the EARLIER date is usually the Debt (Purchase),
    // and the LATER date is the Payment.
    const purchase = t1.date < t2.date ? t1 : t2;
    const payment = t1.date < t2.date ? t2 : t1;

    // Create the "Credit" entry on the Purchase Account (e.g. Klarna)
    const { error: insertErr } = await supabase.from("transactions").insert({
      account_id: purchase.account_id, // Add money back to Klarna
      date: payment.date, // On the day we paid
      amount: Math.abs(payment.amount), // The positive version (+49.90)
      amount_eur: Math.abs(payment.amount), // Simplify currency logic for now
      description: `Payment Received (Settlement)`,
      category: "Transfer", // Mark as transfer so it doesn't look like Income
      is_manual: true,
      original_currency: "EUR", // Ideally fetch account currency, assuming EUR for now
    });

    if (insertErr)
      throw new Error("Failed to create balancing credit transaction");
  }

  // 3. Create the Link (Standard Logic)
  // Store deterministically (lowest ID first) to match UNIQUE constraints if you have them
  const [a, b] = [leftId, rightId].sort();

  const { error } = await supabase.from("transaction_links").insert({
    left_transaction_id: a,
    right_transaction_id: b,
    link_type: linkType,
    amount,
    note,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/");
}

export async function deleteTransactionLink(linkId: string) {
  if (!linkId) return;

  const { error } = await supabase
    .from("transaction_links")
    .delete()
    .eq("id", linkId);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/");
}
// --- Forecast helpers (Step 2B) ---------------------------------------------
type ForecastPlan =
  | { kind: "none" }
  | { kind: "pay30" }
  | { kind: "repeat_monthly"; monthsAhead: number };

function toISODateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODateOnly(d);
}
function addMonthsClamped(dateISO: string, monthsToAdd: number) {
  const d = new Date(dateISO);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDay);

  return toISODateOnly(new Date(Date.UTC(targetYear, targetMonth, clampedDay)));
}

export async function updateTransactionWithForecast(
  transactionId: string,
  updated: {
    account_id: string;
    description: string;
    category: string;
    amount: number;
    amount_eur?: number | null;
    date: string; // ISO string
  },
  plan: ForecastPlan,
) {
  if (!transactionId) throw new Error("transactionId is required");

  // 1) Update transaction
  const { error: upErr } = await supabase
    .from("transactions")
    .update({
      account_id: updated.account_id,
      description: updated.description,
      category: updated.category,
      amount: updated.amount,
      amount_eur: updated.amount_eur ?? null,
      date: updated.date,
    })
    .eq("id", transactionId);

  if (upErr) throw new Error(upErr.message);

  // 2) If no forecast planned, done
  if (!plan || plan.kind === "none") {
    revalidatePath("/transactions");
    revalidatePath("/forecast");
    revalidatePath("/");
    return;
  }

  const category = (updated.category ?? "").trim() || "Uncategorized";
  const amount = Number(updated.amount_eur ?? updated.amount);
  const baseDateISO = updated.date; // must be parseable by Date()

  if (plan.kind === "pay30") {
    const dueDate = addDaysISO(baseDateISO, 30);

    // 1. Create or Update the Rule using Upsert on the unique source_transaction_id
    const { data: rule, error: rErr } = await supabase
      .from("forecast_rules")
      .upsert(
        {
          source_transaction_id: transactionId,
          name: `Pay in 30 — ${updated.description ?? "Transaction"}`,
          type: "one_off",
          account_id: updated.account_id,
          category: category,
          amount: amount,
          currency: "EUR",
          start_date: dueDate,
          end_date: dueDate,
          is_active: true,
        },
        { onConflict: "source_transaction_id" }, // Requires the SQL constraint above
      )
      .select("id")
      .single();

    if (rErr) throw new Error(rErr.message);

    // 2. Upsert the instance
    const { error: iErr } = await supabase.from("forecast_instances").upsert(
      [
        {
          rule_id: rule.id,
          date: dueDate,
          amount,
          status: "projected",
          transaction_id: null,
          note: `Created from transaction ${transactionId}`,
        },
      ],
      { onConflict: "rule_id,date" },
    );
  }

  if (plan.kind === "repeat_monthly") {
    const monthsAhead = Math.max(1, plan.monthsAhead ?? 12);
    const firstDate = addMonthsClamped(baseDateISO, 1);
    const dom = new Date(baseDateISO).getUTCDate();

    // Try to reuse existing rule
    const { data: existing, error: exErr } = await supabase
      .from("forecast_rules")
      .select("id")
      .eq("source_transaction_id", transactionId)
      .eq("type", "recurring")
      .maybeSingle();

    if (exErr) throw new Error(exErr.message);

    let ruleId = existing?.id;

    if (!ruleId) {
      const { data: created, error: rErr } = await supabase
        .from("forecast_rules")
        .insert({
          source_transaction_id: transactionId, // IMPORTANT
          name: `Monthly — ${updated.description ?? "Transaction"}`,
          type: "recurring",
          account_id: updated.account_id,
          category,
          amount,
          currency: "EUR",
          start_date: firstDate,
          end_date: null,
          frequency: "monthly",
          day_of_month: dom,
          is_active: true,
        })
        .select("id")
        .single();

      if (rErr) throw new Error(rErr.message);
      ruleId = created.id;
    }

    const instances = Array.from({ length: monthsAhead }).map((_, i) => ({
      rule_id: ruleId,
      date: addMonthsClamped(firstDate, i),
      amount,
      status: "projected" as const,
      transaction_id: null,
      note: `Created from transaction ${transactionId}`,
    }));

    // Upsert to avoid duplicates on re-save
    const { error: iErr } = await supabase
      .from("forecast_instances")
      .upsert(instances, { onConflict: "rule_id,date" });

    if (iErr) throw new Error(iErr.message);
  }

  revalidatePath("/transactions");
  revalidatePath("/forecast");
  revalidatePath("/");
}

"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// --- 1. CREATE / EDIT FORECAST RULES (The "Plan") ---

export async function upsertForecastRule(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as "recurring" | "one_off" | "installment";
  const frequency = (formData.get("frequency") as string) || "monthly";
  const start_date = formData.get("start_date") as string;
  const account_id = formData.get("account_id") as string;

  // Optional: End Date or Installment Count
  const end_date = (formData.get("end_date") as string) || null;
  const installments_count = formData.get("installments_count")
    ? parseInt(formData.get("installments_count") as string)
    : null;

  const payload = {
    name,
    amount, // Default amount for the rule
    type,
    frequency,
    start_date,
    end_date,
    installments_count,
    account_id,
    is_active: true,
  };

  const { error } = id
    ? await supabase.from("forecast_rules").update(payload).eq("id", id)
    : await supabase.from("forecast_rules").insert(payload);

  if (error) throw new Error(error.message);

  // Trigger regeneration of instances immediately
  await generateForecastInstances({
    startDate: start_date,
    horizonMonths: 12, // Look ahead 1 year
  });

  revalidatePath("/forecast");
}

// --- 2. LINKING: The "Magic" (Transaction -> Forecast) ---

export async function linkTransactionToForecast(
  transactionId: string,
  instanceId: string,
) {
  // 1. Get the transaction amount to update the forecast instance
  const { data: tx } = await supabase
    .from("transactions")
    .select("amount, date")
    .eq("id", transactionId)
    .single();

  if (!tx) throw new Error("Transaction not found");

  // 2. Update the Forecast Instance
  // - Set status to 'realized'
  // - Link the transaction
  // - OPTIONAL: Update the amount to match the real transaction?
  //   Yes, usually you want the forecast to reflect reality once it happens.
  const { error } = await supabase
    .from("forecast_instances")
    .update({
      status: "realized",
      transaction_id: transactionId,
      // We keep the original 'amount' from the rule for comparison,
      // but we could set 'override_amount' or just rely on the linked tx amount in the UI.
      // Let's explicitly set the amount to the real one so the "Running Balance" is correct.
      amount: tx.amount,
    })
    .eq("id", instanceId);

  if (error) throw new Error(error.message);

  revalidatePath("/forecast");
}

// --- 3. SCENARIO PLAYING: Edit a specific month ---

export async function updateForecastInstanceAmount(
  instanceId: string,
  newAmount: number,
) {
  const { error } = await supabase
    .from("forecast_instances")
    .update({
      amount: newAmount,
      // We mark it as projected still, but now it has a custom number
      // This allows you to say: "I will pay only 500 this month"
    })
    .eq("id", instanceId);

  if (error) throw new Error(error.message);
  revalidatePath("/forecast");
}

// --- 4. GENERATION (Preserve existing Manual Edits) ---
// (Refining your existing ensureForecastInstances to be safer)

function addMonthsClamped(dateISO: string, monthsToAdd: number) {
  // ... (Keep your existing date logic here)
  // Re-use your existing helper
  const d = new Date(dateISO);
  d.setMonth(d.getMonth() + monthsToAdd);
  return d.toISOString().slice(0, 10);
}

export async function generateForecastInstances({
  startDate, // usually "today"
  horizonMonths = 12,
}: {
  startDate: string;
  horizonMonths?: number;
}) {
  const { data: rules } = await supabase
    .from("forecast_rules")
    .select("*")
    .eq("is_active", true);

  if (!rules) return;

  const inserts: any[] = [];

  for (const rule of rules) {
    // Generate dates based on rule type
    // ... (Your existing logic for one_off, recurring, installment)
    // Let's assume we generated a list of dates: ['2026-02-01', '2026-03-01']

    // PSEUDO CODE for brevity:
    const dates = []; // calculate dates based on rule
    if (rule.type === "recurring") {
      for (let i = 0; i < horizonMonths; i++)
        dates.push(addMonthsClamped(rule.start_date, i));
    }

    for (const date of dates) {
      if (date < startDate) continue; // Don't backfill past

      inserts.push({
        rule_id: rule.id,
        date: date,
        amount: rule.amount, // Default from rule
        status: "projected",
      });
    }
  }

  // UPSERT is key here.
  // We DO NOT want to overwrite "Realized" or "Manual Edits"
  // So we only insert if it doesn't exist.
  if (inserts.length > 0) {
    const { error } = await supabase
      .from("forecast_instances")
      .upsert(inserts, {
        onConflict: "rule_id,date",
        ignoreDuplicates: true, // <--- CRITICAL: Preserves your manual "Play" edits
      });

    if (error) console.error(error);
  }
}

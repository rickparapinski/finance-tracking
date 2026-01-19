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

function toISODateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
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

export async function generateForecastInstances({
  startDate,
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
    const dates: string[] = [];
    const start = rule.start_date;

    // 1. One-off Rule
    if (rule.type === "one_off") {
      dates.push(start);
    }
    // 2. Installment Rule
    else if (rule.type === "installment" && rule.installments_count) {
      for (let i = 0; i < rule.installments_count; i++) {
        dates.push(addMonthsClamped(start, i));
      }
    }
    // 3. Recurring Rule (Monthly)
    else if (rule.type === "recurring" || rule.type === "budget") {
      // Generate for the requested horizon
      for (let i = 0; i < horizonMonths; i++) {
        dates.push(addMonthsClamped(start, i));
      }
    }

    // Filter dates to ensure we only insert relevant ones (future/present)
    // and stop if rule has an end_date
    for (const date of dates) {
      if (date < startDate) continue;
      if (rule.end_date && date > rule.end_date) continue;

      inserts.push({
        rule_id: rule.id,
        date: date,
        amount: rule.amount,
        status: "projected",
      });
    }
  }

  if (inserts.length > 0) {
    const { error } = await supabase
      .from("forecast_instances")
      .upsert(inserts, {
        onConflict: "rule_id,date",
        ignoreDuplicates: true, // Preserves manual edits/links
      });

    if (error) console.error("Error generating instances:", error);
  }
}
// Add this to the bottom of the file

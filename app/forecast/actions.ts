"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// --- PURE DATE LOGIC (The "Standard" Rule) ---

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

/**
 * Calculates the start date for a given Cycle Month.
 * - Standard: Starts 25th of previous month.
 * - Dec Exception: Cycle "Jan" (Index 0) starts Dec 19th.
 * - Weekend Rule: If start falls on Sat/Sun, move to Mon.
 */
function getCycleStartDate(cycleYear: number, cycleMonthIndex: number): string {
  // 1. Identify "Previous Month" (because Cycle Feb starts in Jan)
  const prevDate = new Date(Date.UTC(cycleYear, cycleMonthIndex - 1, 1));
  const pYear = prevDate.getUTCFullYear();
  const pMonth = prevDate.getUTCMonth();

  // 2. Determine Base Day (19 for Dec, 25 for others)
  let baseDay = 25;
  if (pMonth === 11) baseDay = 19; // If previous month is Dec

  // 3. Create Date and Adjust for Weekend
  const tentative = new Date(Date.UTC(pYear, pMonth, baseDay));
  const day = tentative.getUTCDay(); // 0=Sun, 6=Sat

  if (day === 6)
    tentative.setUTCDate(baseDay + 2); // Sat -> Mon
  else if (day === 0) tentative.setUTCDate(baseDay + 1); // Sun -> Mon

  return toISODateOnly(tentative);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// --- 1. CREATE / EDIT FORECAST RULES ---

export async function upsertForecastRule(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as
    | "recurring"
    | "one_off"
    | "installment"
    | "budget";
  const frequency = (formData.get("frequency") as string) || "monthly";
  const start_date = formData.get("start_date") as string;
  const account_id = formData.get("account_id") as string;
  const category = formData.get("category") as string;

  const end_date = (formData.get("end_date") as string) || null;
  const installments_count = formData.get("installments_count")
    ? parseInt(formData.get("installments_count") as string)
    : null;

  const payload = {
    name,
    amount,
    type,
    frequency,
    start_date,
    end_date,
    installments_count,
    account_id,
    category,
    is_active: true,
  };

  const { error } = id
    ? await supabase.from("forecast_rules").update(payload).eq("id", id)
    : await supabase.from("forecast_rules").insert(payload);

  if (error) throw new Error(error.message);

  await generateForecastInstances({
    startDate: start_date,
    horizonMonths: 12,
  });

  revalidatePath("/forecast");
}

// --- 2. LINKING TRANSACTIONS ---

export async function linkTransactionToForecast(
  transactionId: string,
  instanceId: string,
) {
  const { data: tx } = await supabase
    .from("transactions")
    .select("amount")
    .eq("id", transactionId)
    .single();

  const { data: inst } = await supabase
    .from("forecast_instances")
    .select("*")
    .eq("id", instanceId)
    .single();

  if (!tx || !inst) throw new Error("Not found");

  const currentProjected = inst.override_amount ?? inst.amount;
  // Tolerance allows linking -50 to -50.01 without creating a 0.01 remainder
  const isPartial = Math.abs(tx.amount) < Math.abs(currentProjected) - 0.05;

  if (isPartial) {
    const remainder = currentProjected - tx.amount;

    // 1. Convert current instance to Realized
    const { error: updateErr } = await supabase
      .from("forecast_instances")
      .update({
        status: "realized",
        transaction_id: transactionId,
        amount: tx.amount,
        override_amount: null,
      })
      .eq("id", instanceId);

    if (updateErr) throw new Error(updateErr.message);

    // 2. Create Remainder
    const { error: insertErr } = await supabase
      .from("forecast_instances")
      .insert({
        rule_id: inst.rule_id,
        date: inst.date,
        amount: remainder,
        status: "projected",
      });

    if (insertErr) throw new Error(insertErr.message);
  } else {
    // Full Match
    const { error } = await supabase
      .from("forecast_instances")
      .update({
        status: "realized",
        transaction_id: transactionId,
        amount: tx.amount,
      })
      .eq("id", instanceId);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/forecast");
}

export async function updateForecastInstanceAmount(
  instanceId: string,
  newAmount: number,
) {
  const { error } = await supabase
    .from("forecast_instances")
    .update({
      amount: newAmount,
    })
    .eq("id", instanceId);

  if (error) throw new Error(error.message);
  revalidatePath("/forecast");
}

export async function resetForecast() {
  const { error } = await supabase
    .from("forecast_instances")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw new Error(error.message);
  revalidatePath("/forecast");
}

// --- 3. GENERATION LOGIC (Standardized) ---

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

  if (!rules || rules.length === 0) return;

  const ruleIds = rules.map((r) => r.id);

  // --- BUFFER: 45 Days ---
  // If startDate is 2026-01-01, we look back to mid-Nov 2025.
  // This ensures we catch the Jan Budget (which starts Dec 25th).
  const checkDate = new Date(startDate);
  checkDate.setDate(checkDate.getDate() - 45);
  const checkDateStr = toISODateOnly(checkDate);

  const { data: existing } = await supabase
    .from("forecast_instances")
    .select("rule_id, date")
    .in("rule_id", ruleIds)
    .gte("date", checkDateStr);

  const existingSet = new Set<string>();
  (existing || []).forEach((row) => {
    existingSet.add(`${row.rule_id}|${row.date}`);
  });

  const inserts: any[] = [];

  for (const rule of rules) {
    const dates: string[] = [];

    if (rule.type === "budget") {
      // BUDGETS: Always snap to standard cycle start
      const ruleStart = new Date(rule.start_date);
      const startYear = ruleStart.getUTCFullYear();
      const startMonth = ruleStart.getUTCMonth();

      // Loop horizon + 1 to ensure we cover edge cases
      for (let i = 0; i <= horizonMonths; i++) {
        const loopDate = new Date(Date.UTC(startYear, startMonth + i, 1));
        const cYear = loopDate.getUTCFullYear();
        const cMonth = loopDate.getUTCMonth();

        // PURE CALCULATION: No DB lookup
        dates.push(getCycleStartDate(cYear, cMonth));
      }
    } else if (rule.type === "recurring") {
      // RECURRING: Exact day (e.g. Rent on 1st)
      for (let i = 0; i < horizonMonths; i++) {
        dates.push(addMonthsClamped(rule.start_date, i));
      }
    } else if (rule.type === "one_off") {
      dates.push(rule.start_date);
    } else if (rule.type === "installment" && rule.installments_count) {
      for (let i = 0; i < rule.installments_count; i++) {
        dates.push(addMonthsClamped(rule.start_date, i));
      }
    }

    for (const date of dates) {
      if (existingSet.has(`${rule.id}|${date}`)) continue;
      if (rule.end_date && date > rule.end_date) continue;

      // CRITICAL: Check against BUFFER, not strict startDate
      if (date < checkDateStr) continue;

      inserts.push({
        rule_id: rule.id,
        date: date,
        amount: rule.amount,
        status: "projected",
      });
    }
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("forecast_instances").insert(inserts);
    if (error) console.error("Error generating instances:", error);
  }
}

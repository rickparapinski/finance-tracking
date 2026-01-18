"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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

function withinRange(dateISO: string, startISO: string, endISO: string) {
  return dateISO >= startISO && dateISO <= endISO;
}

export async function ensureForecastInstances({
  startDate,
  endDate,
  horizonMonths = 18,
}: {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  horizonMonths?: number;
}) {
  // Fetch active rules
  const { data: rules, error: rErr } = await supabase
    .from("forecast_rules")
    .select(
      "id,type,amount,start_date,end_date,frequency,day_of_month,installments_count,installment_first_date,is_active",
    )
    .eq("is_active", true);

  if (rErr) throw new Error(rErr.message);

  const inserts: Array<{
    rule_id: string;
    date: string;
    amount: number;
    status: "projected";
  }> = [];

  for (const rule of rules ?? []) {
    if (rule.type === "one_off") {
      // For one_off we expect one instance at start_date (already created when rule created).
      // But ensure it exists:
      const dateISO = rule.start_date;
      if (!dateISO) continue;
      if (!withinRange(dateISO, startDate, endDate)) continue;

      inserts.push({
        rule_id: rule.id,
        date: dateISO,
        amount: Number(rule.amount),
        status: "projected",
      });
      continue;
    }

    if (rule.type === "installment") {
      if (!rule.installments_count || !rule.installment_first_date) continue;

      for (let i = 0; i < rule.installments_count; i++) {
        const dateISO = addMonthsClamped(rule.installment_first_date, i);
        if (!withinRange(dateISO, startDate, endDate)) continue;

        inserts.push({
          rule_id: rule.id,
          date: dateISO,
          amount: Number(rule.amount),
          status: "projected",
        });
      }
      continue;
    }

    if (rule.type === "recurring") {
      if (rule.frequency !== "monthly") continue; // v1: monthly only

      // Generate from max(rule.start_date, startDate) through horizon
      const from = rule.start_date > startDate ? rule.start_date : startDate;

      for (let i = 0; i < horizonMonths; i++) {
        const dateISO = addMonthsClamped(from, i);
        // stop if end_date exists
        if (rule.end_date && dateISO > rule.end_date) break;
        if (!withinRange(dateISO, startDate, endDate)) continue;

        inserts.push({
          rule_id: rule.id,
          date: dateISO,
          amount: Number(rule.amount),
          status: "projected",
        });
      }
    }
  }

  // Insert with de-duplication via unique index (rule_id, date)
  // Supabase JS supports upsert:
  if (inserts.length) {
    const { error: upErr } = await supabase
      .from("forecast_instances")
      .upsert(inserts, { onConflict: "rule_id,date", ignoreDuplicates: true });

    if (upErr) throw new Error(upErr.message);
  }
}
export async function setForecastInstanceStatus(
  instanceId: string,
  status: "projected" | "realized" | "skipped",
) {
  const { error } = await supabase
    .from("forecast_instances")
    .update({ status })
    .eq("id", instanceId);

  if (error) throw new Error(error.message);
}

"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getCycleStartDate } from "@/lib/finance-utils";

// --- PURE DATE HELPERS ---
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// --- 1. MANAGE RULES ---

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

  await generateForecastInstances({ startDate: start_date, horizonMonths: 12 });
  revalidatePath("/forecast");
}

export async function deleteForecastRule(ruleId: string) {
  // 1. Delete future instances (clean up the graph)
  const { error: instError } = await supabase
    .from("forecast_instances")
    .delete()
    .eq("rule_id", ruleId)
    .eq("status", "projected");

  if (instError) throw new Error(instError.message);

  // 2. Soft delete the rule (keep realized history safe)
  const { error } = await supabase
    .from("forecast_rules")
    .update({ is_active: false })
    .eq("id", ruleId);

  if (error) throw new Error(error.message);

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
  const isPartial = Math.abs(tx.amount) < Math.abs(currentProjected) - 0.05;

  if (isPartial) {
    const remainder = currentProjected - tx.amount;
    await supabase
      .from("forecast_instances")
      .update({
        status: "realized",
        transaction_id: transactionId,
        amount: tx.amount,
        override_amount: null,
      })
      .eq("id", instanceId);
    await supabase.from("forecast_instances").insert({
      rule_id: inst.rule_id,
      date: inst.date,
      amount: remainder,
      status: "projected",
    });
  } else {
    await supabase
      .from("forecast_instances")
      .update({
        status: "realized",
        transaction_id: transactionId,
        amount: tx.amount,
      })
      .eq("id", instanceId);
  }
  revalidatePath("/forecast");
}

export async function updateForecastInstanceAmount(
  instanceId: string,
  newAmount: number,
) {
  await supabase
    .from("forecast_instances")
    .update({ amount: newAmount })
    .eq("id", instanceId);
  revalidatePath("/forecast");
}

export async function resetForecast() {
  await supabase
    .from("forecast_instances")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  revalidatePath("/forecast");
}

// --- 3. GENERATION LOGIC ---

export async function generateForecastInstances({
  startDate,
  horizonMonths = 12,
}: {
  startDate: string;
  horizonMonths?: number;
}) {
  const [{ data: rules }, { data: cycles }] = await Promise.all([
    supabase.from("forecast_rules").select("*").eq("is_active", true),
    supabase.from("cycles").select("*"),
  ]);

  if (!rules || rules.length === 0) return;

  const ruleIds = rules.map((r) => r.id);
  const checkDate = new Date(startDate);
  checkDate.setDate(checkDate.getDate() - 45);
  const checkDateStr = toISODateOnly(checkDate);

  const { data: existing } = await supabase
    .from("forecast_instances")
    .select("rule_id, date")
    .in("rule_id", ruleIds)
    .gte("date", checkDateStr);

  const existingSet = new Set<string>();
  (existing || []).forEach((row) =>
    existingSet.add(`${row.rule_id}|${row.date}`),
  );

  const inserts: any[] = [];

  for (const rule of rules) {
    const dates: string[] = [];

    if (rule.type === "budget") {
      const reqStart = new Date(startDate);
      const startYear = reqStart.getUTCFullYear();
      const startMonth = reqStart.getUTCMonth();

      for (let i = -1; i <= horizonMonths; i++) {
        const loopDate = new Date(Date.UTC(startYear, startMonth + i, 1));
        const cYear = loopDate.getUTCFullYear();
        const cMonth = loopDate.getUTCMonth();
        const cycleKey = `${cYear}-${String(cMonth + 1).padStart(2, "0")}`;

        const custom = cycles?.find((c) => c.key === cycleKey);

        if (custom) {
          dates.push(custom.start_date);
        } else {
          const d = getCycleStartDate(cYear, cMonth);
          dates.push(toISODateOnly(d));
        }
      }
    } else if (rule.type === "recurring") {
      const ruleStart = new Date(rule.start_date);
      const reqStart = new Date(startDate);
      const diffMonths =
        (reqStart.getUTCFullYear() - ruleStart.getUTCFullYear()) * 12 +
        (reqStart.getUTCMonth() - ruleStart.getUTCMonth());
      const startOffset = Math.max(0, diffMonths);

      for (let i = -1; i < horizonMonths; i++) {
        dates.push(addMonthsClamped(rule.start_date, startOffset + i));
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
    await supabase.from("forecast_instances").insert(inserts);
  }
}

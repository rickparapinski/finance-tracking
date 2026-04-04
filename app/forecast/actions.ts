"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCycleStartDate } from "@/lib/finance-utils";

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

  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);

  return toISODateOnly(new Date(Date.UTC(targetYear, targetMonth, clampedDay)));
}

// --- 1. MANAGE RULES ---

export async function upsertForecastRule(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string;
  const frequency = (formData.get("frequency") as string) || "monthly";
  const start_date = formData.get("start_date") as string;
  const account_id = formData.get("account_id") as string;
  const category = formData.get("category") as string;
  const end_date = (formData.get("end_date") as string) || null;
  const installments_count = formData.get("installments_count")
    ? parseInt(formData.get("installments_count") as string)
    : null;

  if (id) {
    await sql`
      UPDATE forecast_rules
      SET name = ${name}, amount = ${amount}, type = ${type}, frequency = ${frequency},
          start_date = ${start_date}, end_date = ${end_date}, installments_count = ${installments_count},
          account_id = ${account_id}, category = ${category}, is_active = true
      WHERE id = ${id}
    `;
  } else {
    await sql`
      INSERT INTO forecast_rules (name, amount, type, frequency, start_date, end_date, installments_count, account_id, category, is_active)
      VALUES (${name}, ${amount}, ${type}, ${frequency}, ${start_date}, ${end_date}, ${installments_count}, ${account_id}, ${category}, true)
    `;
  }

  await generateForecastInstances({ startDate: start_date, horizonMonths: 12 });
  revalidatePath("/forecast");
}

export async function deleteForecastRule(ruleId: string) {
  await sql`DELETE FROM forecast_instances WHERE rule_id = ${ruleId} AND status = 'projected'`;
  await sql`UPDATE forecast_rules SET is_active = false WHERE id = ${ruleId}`;
  revalidatePath("/forecast");
}

// --- 2. LINKING TRANSACTIONS ---

export async function linkTransactionToForecast(
  transactionId: string,
  instanceId: string,
) {
  const [tx] = await sql`SELECT amount FROM transactions WHERE id = ${transactionId}`;
  const [inst] = await sql`SELECT * FROM forecast_instances WHERE id = ${instanceId}`;

  if (!tx || !inst) throw new Error("Not found");

  const currentProjected = Number(inst.override_amount ?? inst.amount);
  const isPartial = Math.abs(Number(tx.amount)) < Math.abs(currentProjected) - 0.05;

  if (isPartial) {
    const remainder = currentProjected - Number(tx.amount);
    await sql`
      UPDATE forecast_instances
      SET status = 'realized', transaction_id = ${transactionId},
          amount = ${tx.amount}, override_amount = null
      WHERE id = ${instanceId}
    `;
    await sql`
      INSERT INTO forecast_instances (rule_id, date, amount, status)
      VALUES (${inst.rule_id}, ${inst.date}, ${remainder}, 'projected')
    `;
  } else {
    await sql`
      UPDATE forecast_instances
      SET status = 'realized', transaction_id = ${transactionId}, amount = ${tx.amount}
      WHERE id = ${instanceId}
    `;
  }
  revalidatePath("/forecast");
}

export async function updateForecastInstanceAmount(instanceId: string, newAmount: number) {
  await sql`UPDATE forecast_instances SET amount = ${newAmount} WHERE id = ${instanceId}`;
  revalidatePath("/forecast");
}

export async function resetForecast() {
  await sql`DELETE FROM forecast_instances`;
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
  const [rules, cycles] = await Promise.all([
    sql`SELECT * FROM forecast_rules WHERE is_active = true`,
    sql`SELECT * FROM cycles`,
  ]);

  if (!rules.length) return;

  const ruleIds = rules.map((r) => r.id);
  const checkDate = new Date(startDate);
  checkDate.setDate(checkDate.getDate() - 45);
  const checkDateStr = toISODateOnly(checkDate);

  const existing = await sql`
    SELECT rule_id, date FROM forecast_instances
    WHERE rule_id = ANY(${ruleIds}) AND date >= ${checkDateStr}
  `;

  const existingSet = new Set<string>();
  existing.forEach((row) => existingSet.add(`${row.rule_id}|${row.date}`));

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

        const custom = cycles.find((c) => c.key === cycleKey);
        if (custom) {
          dates.push(custom.start_date);
        } else {
          dates.push(toISODateOnly(getCycleStartDate(cYear, cMonth)));
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

      inserts.push({ rule_id: rule.id, date, amount: rule.amount, status: "projected" });
    }
  }

  if (inserts.length > 0) {
    await sql`INSERT INTO forecast_instances ${sql(inserts)} ON CONFLICT (rule_id, date) DO NOTHING`;
  }
}

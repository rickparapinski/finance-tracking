"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CycleConfig = {
  key: string;
  start_date: string;
  end_date: string;
};

export async function upsertCycle(cycle: CycleConfig) {
  await sql`
    INSERT INTO cycles (key, start_date, end_date)
    VALUES (${cycle.key}, ${cycle.start_date}, ${cycle.end_date})
    ON CONFLICT (key) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
  `;

  // Clean up projected budget instances so they regenerate with new dates
  const budgetRuleIds = await sql`SELECT id FROM forecast_rules WHERE type = 'budget'`;
  const ids = budgetRuleIds.map((r) => r.id);

  if (ids.length > 0) {
    await sql`
      DELETE FROM forecast_instances
      WHERE status = 'projected' AND rule_id = ANY(${ids})
    `;
  }

  revalidatePath("/");
  revalidatePath("/forecast");
  revalidatePath("/settings");
}

export async function getCustomCycles() {
  const data = await sql`SELECT * FROM cycles ORDER BY key ASC`;
  return data;
}

export async function resetData() {
  const tables = ["transaction_links", "forecast_instances", "transactions", "accounts", "cycles"];
  for (const table of tables) {
    await sql`DELETE FROM ${sql(table)}`;
  }
  revalidatePath("/", "layout");
}

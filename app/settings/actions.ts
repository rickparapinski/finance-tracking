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

  revalidatePath("/");
  revalidatePath("/settings");
}

export async function getCustomCycles() {
  const data = await sql`SELECT * FROM cycles ORDER BY key ASC`;
  return data;
}

export async function resetData() {
  const tables = ["transaction_links", "forecast_instances", "forecast_rules", "transactions", "accounts", "cycles"];
  for (const table of tables) {
    await sql`DELETE FROM ${sql(table)}`;
  }
  revalidatePath("/", "layout");
}

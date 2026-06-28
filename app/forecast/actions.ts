"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function upsertForecastRule(data: {
  id?: string;
  name: string;
  amount: number;
  type: string;
  start_date: string;
  end_date?: string | null;
  installments_count?: number | null;
}) {
  const { id, name, amount, type, start_date, end_date = null, installments_count = null } = data;

  if (id) {
    await sql`
      UPDATE forecast_rules
      SET name = ${name}, amount = ${amount}, type = ${type},
          start_date = ${start_date}, end_date = ${end_date},
          installments_count = ${installments_count}, is_active = true
      WHERE id = ${id}
    `;
  } else {
    await sql`
      INSERT INTO forecast_rules (name, amount, type, start_date, end_date, installments_count, is_active)
      VALUES (${name}, ${amount}, ${type}, ${start_date}, ${end_date}, ${installments_count}, true)
    `;
  }
  revalidatePath("/forecast");
}

export async function deleteForecastRule(id: string) {
  await sql`UPDATE forecast_rules SET is_active = false WHERE id = ${id}`;
  revalidatePath("/forecast");
}

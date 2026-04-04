"use server";

import { sql } from "@/lib/db";

export async function getAccountsForImport() {
  const accounts = await sql`SELECT id, name, currency FROM accounts ORDER BY name`;
  return accounts as { id: string; name: string; currency: string }[];
}

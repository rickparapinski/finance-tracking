// app/accounts/actions.ts
"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

const ACCOUNT_TYPES: Record<string, "asset" | "liability"> = {
  Checking: "asset",
  Savings: "asset",
  Investment: "asset",
  "Credit Card": "liability",
  Loan: "liability",
};

export async function upsertAccount(formData: FormData) {
  const id = (formData.get("id") as string) || "";
  const name = (formData.get("name") as string) || "";
  const currency = (formData.get("currency") as string) || "EUR";

  const rawType = (formData.get("type") as string) || "Checking";
  const type = Object.keys(ACCOUNT_TYPES).includes(rawType) ? rawType : "Checking";
  const nature = ACCOUNT_TYPES[type];

  const initial_balance =
    parseFloat((formData.get("initial_balance") as string) || "0") || 0;

  if (id) {
    await sql`
      UPDATE accounts
      SET name = ${name}, currency = ${currency}, type = ${type}, nature = ${nature}, initial_balance = ${initial_balance}
      WHERE id = ${id}
    `;
  } else {
    await sql`
      INSERT INTO accounts (name, currency, type, nature, initial_balance)
      VALUES (${name}, ${currency}, ${type}, ${nature}, ${initial_balance})
    `;
  }

  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function archiveAccount(id: string) {
  await sql`UPDATE accounts SET status = 'archived' WHERE id = ${id}`;
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function restoreAccount(id: string) {
  await sql`UPDATE accounts SET status = 'active' WHERE id = ${id}`;
  revalidatePath("/accounts");
  revalidatePath("/");
}

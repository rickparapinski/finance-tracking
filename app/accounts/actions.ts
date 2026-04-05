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

  const credit_limit =
    parseFloat((formData.get("credit_limit") as string) || "0") || null;
  const interest_rate =
    parseFloat((formData.get("interest_rate") as string) || "0") || null;
  const loan_original_amount =
    parseFloat((formData.get("loan_original_amount") as string) || "0") || null;
  const monthly_payment =
    parseFloat((formData.get("monthly_payment") as string) || "0") || null;

  if (id) {
    await sql`
      UPDATE accounts
      SET name = ${name}, currency = ${currency}, type = ${type}, nature = ${nature},
          initial_balance = ${initial_balance},
          credit_limit = ${credit_limit}, interest_rate = ${interest_rate},
          loan_original_amount = ${loan_original_amount}, monthly_payment = ${monthly_payment}
      WHERE id = ${id}
    `;
  } else {
    await sql`
      INSERT INTO accounts (name, currency, type, nature, initial_balance, credit_limit, interest_rate, loan_original_amount, monthly_payment)
      VALUES (${name}, ${currency}, ${type}, ${nature}, ${initial_balance}, ${credit_limit}, ${interest_rate}, ${loan_original_amount}, ${monthly_payment})
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

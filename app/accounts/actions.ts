// app/accounts/actions.ts
"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function fetchEurRate(currency: string): Promise<number | null> {
  if (currency === "EUR") return 1;
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?from=${encodeURIComponent(currency)}&to=EUR`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.rates?.EUR as number) ?? null;
  } catch {
    return null;
  }
}

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

  const initial_balance_eur_raw = formData.get("initial_balance_eur") as string;
  let initial_balance_eur: number | null =
    initial_balance_eur_raw !== "" && initial_balance_eur_raw != null
      ? parseFloat(initial_balance_eur_raw) || 0
      : currency === "EUR" ? initial_balance : null;

  // Auto-compute EUR equivalent using today's rate if not provided
  if (initial_balance_eur === null && currency !== "EUR") {
    const rate = await fetchEurRate(currency);
    if (rate != null) {
      initial_balance_eur = parseFloat((initial_balance * rate).toFixed(2));
    }
  }

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
          initial_balance = ${initial_balance}, initial_balance_eur = ${initial_balance_eur},
          credit_limit = ${credit_limit}, interest_rate = ${interest_rate},
          loan_original_amount = ${loan_original_amount}, monthly_payment = ${monthly_payment}
      WHERE id = ${id}
    `;
  } else {
    await sql`
      INSERT INTO accounts (name, currency, type, nature, initial_balance, initial_balance_eur, credit_limit, interest_rate, loan_original_amount, monthly_payment)
      VALUES (${name}, ${currency}, ${type}, ${nature}, ${initial_balance}, ${initial_balance_eur}, ${credit_limit}, ${interest_rate}, ${loan_original_amount}, ${monthly_payment})
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

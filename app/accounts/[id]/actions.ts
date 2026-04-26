"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAccountTransactions(
  accountId: string,
  startDate: string,
  endDate: string,
) {
  return await sql`
    SELECT *
    FROM transactions
    WHERE account_id = ${accountId}
      AND date >= ${startDate} AND date <= ${endDate}
    ORDER BY date DESC
  `;
}
import {
  getCurrentCycle,
  fetchCycleRates,
  getRateForDay,
  convertToEur,
} from "@/lib/finance-utils";

export async function createTransaction(formData: FormData) {
  const account_id = String(formData.get("account_id") || "");
  const dateStr = String(formData.get("date") || "");
  const description = String(formData.get("description") || "");
  const category = String(formData.get("category") || "Uncategorized");
  const amountRaw = String(formData.get("amount") || "0");

  if (!account_id) throw new Error("Missing account_id");
  if (!dateStr) throw new Error("Missing date");
  if (!description) throw new Error("Missing description");

  const amount = Number(amountRaw);
  if (Number.isNaN(amount)) throw new Error("Invalid amount");

  const [acc] = await sql`SELECT currency FROM accounts WHERE id = ${account_id}`;

  if (!acc?.currency) throw new Error("Failed to load account currency");

  const original_currency = acc.currency;
  let amount_eur = amount;

  if (original_currency !== "EUR") {
    const { start, end } = getCurrentCycle();
    const rates = await fetchCycleRates(start, end, original_currency);

    if (rates) {
      const rateFromPerEur = getRateForDay(rates, new Date(dateStr), original_currency);
      if (rateFromPerEur) {
        amount_eur = Number(
          convertToEur({ amount, fromCurrency: original_currency, rateFromPerEur }).toFixed(2),
        );
      }
    }
  }

  await sql`
    INSERT INTO transactions (account_id, date, description, category, amount, is_manual, original_currency, amount_eur)
    VALUES (${account_id}, ${dateStr}, ${description}, ${category}, ${amount}, true, ${original_currency}, ${amount_eur})
  `;

  revalidatePath(`/accounts/${account_id}`);
  revalidatePath("/transactions");
}

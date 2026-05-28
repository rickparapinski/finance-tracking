"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function confirmStaged(
  stagedId: string,
  data: {
    accountId: string;
    description: string;
    amount: number;    // always positive; we negate it (expense)
    date: string;
    category: string;
  }
) {
  const [account] = await sql`SELECT currency FROM accounts WHERE id = ${data.accountId}`;
  if (!account) throw new Error("Account not found");

  const expense = -Math.abs(data.amount);

  await sql`
    INSERT INTO transactions
      (account_id, description, amount, amount_eur, date, category, original_currency, is_manual)
    VALUES (
      ${data.accountId},
      ${data.description},
      ${expense},
      ${account.currency === "EUR" ? expense : null},
      ${data.date},
      ${data.category || "Uncategorized"},
      ${account.currency},
      true
    )
  `;

  await sql`
    UPDATE staged_transactions
    SET status = 'confirmed', processed_at = NOW()
    WHERE id = ${stagedId}
  `;

  revalidatePath("/inbox");
  revalidatePath("/transactions");
}

export async function dismissStaged(id: string) {
  await sql`
    UPDATE staged_transactions
    SET status = 'dismissed', processed_at = NOW()
    WHERE id = ${id}
  `;
  revalidatePath("/inbox");
}

export async function dismissAll() {
  await sql`
    UPDATE staged_transactions
    SET status = 'dismissed', processed_at = NOW()
    WHERE status = 'pending'
  `;
  revalidatePath("/inbox");
}

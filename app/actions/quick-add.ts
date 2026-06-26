"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";

export async function getSpotRate(currency: string): Promise<number | null> {
  if (currency === "EUR") return 1;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?from=EUR&to=${encodeURIComponent(currency)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.rates?.[currency] ?? null;
  } catch {
    return null;
  }
}

export async function createQuickTransaction(formData: FormData) {
  const account_id = formData.get("account_id") as string;
  const description = (formData.get("description") as string)?.trim();
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const category = ((formData.get("category") as string) ?? "").trim() || "Uncategorized";
  const counterpart_account_id = (formData.get("counterpart_account_id") as string) || null;

  const installment_index = parseInt(formData.get("installment_index") as string) || null;
  const installment_total = parseInt(formData.get("installment_total") as string) || null;

  if (!account_id) throw new Error("Account is required");
  if (!description) throw new Error("Description is required");
  if (!date) throw new Error("Date is required");
  if (Number.isNaN(amount)) throw new Error("Invalid amount");

  const [account] = await sql`SELECT name, currency FROM accounts WHERE id = ${account_id}`;
  if (!account) throw new Error("Account not found");

  const currency = account.currency as string;
  let amount_eur: number | null = null;

  if (currency === "EUR") {
    amount_eur = amount;
  } else {
    try {
      const res = await fetch(
        `https://api.frankfurter.dev/v1/${date}?from=${encodeURIComponent(currency)}&to=EUR`,
        { next: { revalidate: 3600 } },
      );
      if (res.ok) {
        const data = await res.json();
        const rate = data?.rates?.EUR as number | undefined;
        if (rate) amount_eur = parseFloat((amount * rate).toFixed(2));
      }
    } catch {
      // leave amount_eur null
    }
  }

  const [tx] = await sql`
    INSERT INTO transactions
      (account_id, description, amount, amount_eur, date, category, original_currency, is_manual,
       installment_index, installment_total)
    VALUES
      (${account_id}, ${description}, ${amount}, ${amount_eur}, ${date}, ${category}, ${currency}, true,
       ${installment_index}, ${installment_total})
    RETURNING id
  `;

  // If Transfer with a counterpart account, mirror the transaction and link them
  if (category === "Transfer" && counterpart_account_id) {
    const [counterAccount] = await sql`
      SELECT currency FROM accounts WHERE id = ${counterpart_account_id}
    `;

    const counterCurrency = counterAccount?.currency ?? "EUR";

    // For cross-currency transfers, estimate the native amount in the target currency.
    // Same-currency: just negate. EUR→foreign: convert via spot rate. Foreign→EUR: use amount_eur.
    let counterAmount: number;
    let counterAmountEur: number | null = amount_eur != null ? -amount_eur : null;

    if (counterCurrency === currency) {
      counterAmount = -amount;
    } else if (currency === "EUR") {
      // Source is EUR → estimate target native amount using today's spot rate
      const spotRate = await getSpotRate(counterCurrency); // units of counterCurrency per EUR
      counterAmount = spotRate != null
        ? parseFloat((-amount * spotRate).toFixed(2))
        : -amount;
    } else if (counterCurrency === "EUR") {
      // Target is EUR → use the EUR-equivalent as the native amount
      counterAmount = amount_eur != null ? -amount_eur : -amount;
      counterAmountEur = counterAmount;
    } else {
      // Both non-EUR: estimate via EUR equivalent and target spot rate
      const spotRate = await getSpotRate(counterCurrency);
      counterAmount = amount_eur != null && spotRate != null
        ? parseFloat((-amount_eur * spotRate).toFixed(2))
        : -amount;
    }

    const [counterTx] = await sql`
      INSERT INTO transactions
        (account_id, description, amount, amount_eur, date, category, original_currency, is_manual)
      VALUES
        (${counterpart_account_id}, ${description}, ${counterAmount}, ${counterAmountEur},
         ${date}, 'Transfer', ${counterCurrency}, true)
      RETURNING id
    `;

    const [a, b] = [tx.id, counterTx.id].sort();
    await sql`
      INSERT INTO transaction_links (left_transaction_id, right_transaction_id, link_type, amount)
      VALUES (${a}, ${b}, 'transfer', ${Math.abs(amount_eur ?? amount)})
    `;
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath(`/accounts/${slugify(account.name)}`);
  if (counterpart_account_id) {
    const [cp] = await sql`SELECT name FROM accounts WHERE id = ${counterpart_account_id}`;
    if (cp) revalidatePath(`/accounts/${slugify(cp.name)}`);
  }
}

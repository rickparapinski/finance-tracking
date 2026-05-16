"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { addMonthsISO } from "@/lib/installment";
import { tryAutoMatchForecast } from "@/lib/forecast-automatch";

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

  const [account] = await sql`SELECT currency FROM accounts WHERE id = ${account_id}`;
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

  await tryAutoMatchForecast(String(tx.id));

  // If Transfer with a counterpart account, mirror the transaction and link them
  if (category === "Transfer" && counterpart_account_id) {
    const [counterAccount] = await sql`
      SELECT currency FROM accounts WHERE id = ${counterpart_account_id}
    `;

    const counterAmount = -amount;
    const counterAmountEur = amount_eur != null ? -amount_eur : null;
    const counterCurrency = counterAccount?.currency ?? "EUR";

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

  // Create forecast entries for remaining installments
  if (
    installment_index != null &&
    installment_total != null &&
    installment_index < installment_total
  ) {
    const remaining = installment_total - installment_index;
    const forecastAmount = amount_eur ?? amount;
    const dom = new Date(date).getDate();
    const startDate = addMonthsISO(date, 1);
    const endDate = addMonthsISO(date, remaining);
    const ruleName = `Installments: ${description}`;

    const [rule] = await sql`
      INSERT INTO forecast_rules
        (source_transaction_id, account_id, name, type, category, amount, currency,
         start_date, end_date, frequency, day_of_month, installments_count, is_active)
      VALUES
        (${tx.id}, ${account_id}, ${ruleName}, 'recurring', ${category}, ${forecastAmount}, 'EUR',
         ${startDate}, ${endDate}, 'monthly', ${dom}, ${remaining}, true)
      ON CONFLICT (source_transaction_id) DO UPDATE
        SET name = EXCLUDED.name, installments_count = EXCLUDED.installments_count,
            start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
      RETURNING id
    `;

    const instances = Array.from({ length: remaining }, (_, i) => ({
      rule_id: rule.id,
      date: addMonthsISO(date, i + 1),
      amount: forecastAmount,
      status: "projected",
      transaction_id: null,
      note: `Installment ${installment_index + i + 1}/${installment_total}`,
    }));

    await sql`
      INSERT INTO forecast_instances ${sql(instances)}
      ON CONFLICT (rule_id, date) DO NOTHING
    `;
  }

  revalidatePath("/transactions");
  revalidatePath("/forecast");
  revalidatePath("/");
  revalidatePath(`/accounts/${account_id}`);
  if (counterpart_account_id) revalidatePath(`/accounts/${counterpart_account_id}`);
}

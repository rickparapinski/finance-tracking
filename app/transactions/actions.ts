"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteTransaction(id: string) {
  await sql`DELETE FROM transactions WHERE id = ${id}`;
  revalidatePath("/transactions");
}

export async function createManualTransaction(formData: FormData) {
  const account_id = formData.get("account_id") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const rawCategory = (formData.get("category") as string) ?? "";
  const category = rawCategory.trim() || "Uncategorized";

  const [account] = await sql`SELECT currency FROM accounts WHERE id = ${account_id}`;
  if (!account) throw new Error("Account not found");

  await sql`
    INSERT INTO transactions (account_id, description, amount, date, category, original_currency, is_manual, amount_eur)
    VALUES (
      ${account_id}, ${description}, ${amount}, ${date}, ${category},
      ${account.currency}, true,
      ${account.currency === "EUR" ? amount : null}
    )
  `;

  revalidatePath("/transactions");
}

export async function updateTransaction(formData: FormData) {
  const id = formData.get("id") as string;
  const date = formData.get("date") as string;
  const description = formData.get("description") as string;
  const rawCategory = (formData.get("category") as string) ?? "";
  const category = rawCategory.trim() || "Uncategorized";
  const newAmount = parseFloat(formData.get("amount") as string);

  const [oldData] = await sql`SELECT amount, amount_eur FROM transactions WHERE id = ${id}`;
  if (!oldData) throw new Error("Transaction not found");

  let newAmountEur = Number(oldData.amount_eur);
  if (newAmount !== Number(oldData.amount)) {
    if (oldData.amount_eur && Number(oldData.amount_eur) !== 0) {
      const impliedRate = Number(oldData.amount) / Number(oldData.amount_eur);
      newAmountEur = newAmount / impliedRate;
    } else {
      newAmountEur = newAmount;
    }
  }

  await sql`
    UPDATE transactions
    SET date = ${date}, description = ${description}, category = ${category},
        amount = ${newAmount}, amount_eur = ${newAmountEur}
    WHERE id = ${id}
  `;

  revalidatePath("/transactions");
  revalidatePath("/");
}

export async function bulkAssignCategory(ids: string[], category: string) {
  if (!ids?.length) return;
  const cleanCategory = (category ?? "").trim();
  if (!cleanCategory) throw new Error("Category is required");

  await sql`UPDATE transactions SET category = ${cleanCategory} WHERE id = ANY(${ids})`;

  revalidatePath("/transactions");
  revalidatePath("/");
}

export type TransactionLinkType =
  | "transfer"
  | "settlement"
  | "statement_payment"
  | "refund"
  | "allocation";

export async function createTransactionLink(args: {
  leftId: string;
  rightId: string;
  linkType: TransactionLinkType;
  amount?: number | null;
  note?: string | null;
}) {
  const { leftId, rightId, linkType, amount = null, note = null } = args;

  if (!leftId || !rightId) throw new Error("Two transaction IDs are required");
  if (leftId === rightId) throw new Error("Cannot link a transaction to itself");

  const txs = await sql`
    SELECT t.id, t.amount, t.account_id, t.date, t.description,
           json_build_object('type', a.type) AS accounts
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.id = ANY(${[leftId, rightId]})
  `;

  if (txs.length !== 2) throw new Error("Transactions not found");

  const [t1, t2] = txs as any[];

  if (linkType === "settlement" && t1.amount < 0 && t2.amount < 0) {
    const purchase = t1.date < t2.date ? t1 : t2;
    const payment = t1.date < t2.date ? t2 : t1;

    await sql`
      INSERT INTO transactions (account_id, date, amount, amount_eur, description, category, is_manual, original_currency)
      VALUES (
        ${purchase.account_id}, ${payment.date},
        ${Math.abs(payment.amount)}, ${Math.abs(payment.amount)},
        'Payment Received (Settlement)', 'Transfer', true, 'EUR'
      )
    `;
  }

  const [a, b] = [leftId, rightId].sort();

  await sql`
    INSERT INTO transaction_links (left_transaction_id, right_transaction_id, link_type, amount, note)
    VALUES (${a}, ${b}, ${linkType}, ${amount}, ${note})
  `;

  revalidatePath("/transactions");
  revalidatePath("/");
}

export async function deleteTransactionLink(linkId: string) {
  if (!linkId) return;
  await sql`DELETE FROM transaction_links WHERE id = ${linkId}`;
  revalidatePath("/transactions");
  revalidatePath("/");
}

// --- Forecast helpers ---
type ForecastPlan =
  | { kind: "none" }
  | { kind: "pay30" }
  | { kind: "repeat_monthly"; monthsAhead: number };

function toISODateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODateOnly(d);
}
function addMonthsClamped(dateISO: string, monthsToAdd: number) {
  const d = new Date(dateISO);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);

  return toISODateOnly(new Date(Date.UTC(targetYear, targetMonth, clampedDay)));
}

export async function updateTransactionWithForecast(
  transactionId: string,
  updated: {
    account_id: string;
    description: string;
    category: string;
    amount: number;
    amount_eur?: number | null;
    date: string;
  },
  plan: ForecastPlan,
) {
  if (!transactionId) throw new Error("transactionId is required");

  await sql`
    UPDATE transactions
    SET account_id = ${updated.account_id}, description = ${updated.description},
        category = ${updated.category}, amount = ${updated.amount},
        amount_eur = ${updated.amount_eur ?? null}, date = ${updated.date}
    WHERE id = ${transactionId}
  `;

  if (!plan || plan.kind === "none") {
    revalidatePath("/transactions");
    revalidatePath("/forecast");
    revalidatePath("/");
    return;
  }

  const category = (updated.category ?? "").trim() || "Uncategorized";
  const amount = Number(updated.amount_eur ?? updated.amount);
  const baseDateISO = updated.date;

  if (plan.kind === "pay30") {
    const dueDate = addDaysISO(baseDateISO, 30);

    const [rule] = await sql`
      INSERT INTO forecast_rules
        (source_transaction_id, name, type, account_id, category, amount, currency, start_date, end_date, is_active)
      VALUES
        (${transactionId}, ${"Pay in 30 — " + (updated.description ?? "Transaction")},
         'one_off', ${updated.account_id}, ${category}, ${amount}, 'EUR', ${dueDate}, ${dueDate}, true)
      ON CONFLICT (source_transaction_id) DO UPDATE SET
        name = EXCLUDED.name, type = EXCLUDED.type, account_id = EXCLUDED.account_id,
        category = EXCLUDED.category, amount = EXCLUDED.amount, start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date, is_active = EXCLUDED.is_active
      RETURNING id
    `;

    await sql`
      INSERT INTO forecast_instances (rule_id, date, amount, status, transaction_id, note)
      VALUES (${rule.id}, ${dueDate}, ${amount}, 'projected', null, ${"Created from transaction " + transactionId})
      ON CONFLICT (rule_id, date) DO NOTHING
    `;
  }

  if (plan.kind === "repeat_monthly") {
    const monthsAhead = Math.max(1, plan.monthsAhead ?? 12);
    const firstDate = addMonthsClamped(baseDateISO, 1);
    const dom = new Date(baseDateISO).getUTCDate();

    const [existing] = await sql`
      SELECT id FROM forecast_rules
      WHERE source_transaction_id = ${transactionId} AND type = 'recurring'
    `;

    let ruleId = existing?.id;

    if (!ruleId) {
      const [created] = await sql`
        INSERT INTO forecast_rules
          (source_transaction_id, name, type, account_id, category, amount, currency,
           start_date, end_date, frequency, day_of_month, is_active)
        VALUES
          (${transactionId}, ${"Monthly — " + (updated.description ?? "Transaction")},
           'recurring', ${updated.account_id}, ${category}, ${amount}, 'EUR',
           ${firstDate}, null, 'monthly', ${dom}, true)
        RETURNING id
      `;
      ruleId = created.id;
    }

    const instances = Array.from({ length: monthsAhead }).map((_, i) => ({
      rule_id: ruleId,
      date: addMonthsClamped(firstDate, i),
      amount,
      status: "projected",
      transaction_id: null,
      note: null,
    }));

    await sql`
      INSERT INTO forecast_instances ${sql(instances)}
      ON CONFLICT (rule_id, date) DO NOTHING
    `;
  }

  revalidatePath("/transactions");
  revalidatePath("/forecast");
  revalidatePath("/");
}

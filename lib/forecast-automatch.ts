import { sql } from "@/lib/db";

/**
 * After a transaction is inserted, try to auto-link it to a projected forecast instance.
 * Matches on: same category + amount within 10% + date within 15 days + status = projected.
 * Only auto-links when exactly one candidate is found (avoids ambiguity).
 */
export async function tryAutoMatchForecast(txId: string): Promise<boolean> {
  const [tx] = await sql`
    SELECT id, category, amount, amount_eur, date FROM transactions WHERE id = ${txId}
  `;
  if (!tx || !tx.category || tx.category === "Uncategorized" || tx.category === "Transfer") {
    return false;
  }

  const txAmount = Number(tx.amount_eur ?? tx.amount);
  const txDate = tx.date as string;

  // tolerance: 10% of amount, date ±15 days
  const tolerance = Math.abs(txAmount) * 0.1;
  const dateFrom = new Date(txDate);
  dateFrom.setDate(dateFrom.getDate() - 15);
  const dateTo = new Date(txDate);
  dateTo.setDate(dateTo.getDate() + 15);

  const candidates = await sql`
    SELECT fi.id FROM forecast_instances fi
    JOIN forecast_rules fr ON fr.id = fi.rule_id
    WHERE fi.status = 'projected'
      AND fi.transaction_id IS NULL
      AND fr.category = ${tx.category}
      AND fi.date >= ${dateFrom.toISOString().slice(0, 10)}
      AND fi.date <= ${dateTo.toISOString().slice(0, 10)}
      AND ABS(COALESCE(fi.override_amount, fi.amount) - ${txAmount}) <= ${tolerance}
  `;

  if (candidates.length !== 1) return false;

  await sql`
    UPDATE forecast_instances
    SET status = 'realized', transaction_id = ${txId}, amount = ${txAmount}
    WHERE id = ${candidates[0].id}
  `;

  return true;
}

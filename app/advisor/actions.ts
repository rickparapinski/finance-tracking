"use server";

import { sql } from "@/lib/db";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";

export async function getFinancialSnapshot() {
  // Use the same billing cycle the rest of the app uses (e.g. Mar 25 – Apr 27)
  const { start, end, key: cycleKey } = await fetchCurrentCycle();
  const cycleStart = start.toISOString().slice(0, 10);
  const cycleEnd   = end.toISOString().slice(0, 10);

  // Previous cycle: go back one month from cycle start
  const prevEnd   = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setMonth(prevStart.getMonth() - 1);
  prevStart.setDate(start.getDate()); // same day-of-month
  const prevStartStr = prevStart.toISOString().slice(0, 10);
  const prevEndStr   = prevEnd.toISOString().slice(0, 10);

  // Human-readable label, e.g. "25 Mar – 27 Apr 2026"
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const periodLabel = `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;

  const [accounts, thisPeriod, lastPeriod, topTx, recurring, budgets, allTx] = await Promise.all([
    // All active account balances (all-time, as of today)
    sql`
      SELECT a.id, a.name, a.nature, a.currency,
             COALESCE(a.initial_balance_eur, CASE WHEN a.currency = 'EUR' THEN a.initial_balance ELSE 0 END) AS base_eur,
             COALESCE(SUM(t.amount_eur), 0) AS activity_eur
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id
      WHERE a.status = 'active'
      GROUP BY a.id
      ORDER BY a.nature, a.name
    `,

    // This cycle by category
    sql`
      SELECT category,
             ROUND(SUM(COALESCE(amount_eur, amount))::numeric, 2) AS total,
             COUNT(*) AS tx_count
      FROM transactions
      WHERE date >= ${cycleStart} AND date <= ${cycleEnd}
      GROUP BY category
      ORDER BY SUM(COALESCE(amount_eur, amount)) ASC
    `,

    // Previous cycle by category (for comparison)
    sql`
      SELECT category,
             ROUND(SUM(COALESCE(amount_eur, amount))::numeric, 2) AS total
      FROM transactions
      WHERE date >= ${prevStartStr} AND date <= ${prevEndStr}
      GROUP BY category
    `,

    // Top transactions this cycle by absolute value
    sql`
      SELECT t.date, t.description,
             ROUND(COALESCE(t.amount_eur, t.amount)::numeric, 2) AS amount_eur,
             t.original_currency, t.category, a.name AS account_name
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE t.date >= ${cycleStart} AND t.date <= ${cycleEnd}
      ORDER BY ABS(COALESCE(t.amount_eur, t.amount)) DESC
      LIMIT 12
    `,

    // Recurring forecast rules
    sql`
      SELECT name, amount, currency, frequency, type
      FROM forecast_rules
      WHERE is_active = true AND type = 'recurring'
      ORDER BY amount ASC
    `,

    // Categories with budgets
    sql`
      SELECT name, monthly_budget
      FROM categories
      WHERE monthly_budget > 0 AND is_active = true
      ORDER BY monthly_budget DESC
    `,

    // ALL transactions in the period — full detail for granular Q&A
    // Cached in the system prompt so follow-up messages cost ~10% of the
    // context price.
    sql`
      SELECT t.date, t.description,
             ROUND(COALESCE(t.amount_eur, t.amount)::numeric, 2) AS eur,
             t.original_currency,
             ROUND(t.amount::numeric, 2) AS native_amount,
             t.category, t.tag, a.name AS account
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE t.date >= ${cycleStart} AND t.date <= ${cycleEnd}
      ORDER BY t.date ASC, ABS(COALESCE(t.amount_eur, t.amount)) DESC
    `,
  ]);

  return {
    cycleKey,
    cycleStart,
    cycleEnd,
    periodLabel,
    accounts,
    thisMonth: thisPeriod,
    lastMonth: lastPeriod,
    topTx,
    recurring,
    budgets,
    allTransactions: allTx,
  };
}

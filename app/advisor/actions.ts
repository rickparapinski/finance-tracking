"use server";

import { sql } from "@/lib/db";

export async function getFinancialSnapshot() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  const lastMonthD = new Date(year, month - 2, 1);
  const lastMonthStart = `${lastMonthD.getFullYear()}-${String(lastMonthD.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthEnd = new Date(year, month - 1, 0).toISOString().slice(0, 10);

  const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const [accounts, thisMonth, lastMonth, topTx, recurring, budgets] = await Promise.all([
    // Account balances
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

    // This month by category
    sql`
      SELECT category,
             ROUND(SUM(COALESCE(amount_eur, amount))::numeric, 2) AS total,
             COUNT(*) AS tx_count
      FROM transactions
      WHERE date >= ${monthStart} AND date <= ${monthEnd}
      GROUP BY category
      ORDER BY SUM(COALESCE(amount_eur, amount)) ASC
    `,

    // Last month by category
    sql`
      SELECT category,
             ROUND(SUM(COALESCE(amount_eur, amount))::numeric, 2) AS total
      FROM transactions
      WHERE date >= ${lastMonthStart} AND date <= ${lastMonthEnd}
      GROUP BY category
    `,

    // Top transactions this month by absolute value
    sql`
      SELECT t.date, t.description,
             ROUND(COALESCE(t.amount_eur, t.amount)::numeric, 2) AS amount_eur,
             t.original_currency, t.category, a.name AS account_name
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE t.date >= ${monthStart} AND t.date <= ${monthEnd}
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
  ]);

  return { monthName, accounts, thisMonth, lastMonth, topTx, recurring, budgets };
}

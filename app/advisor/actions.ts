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

export function buildSystemPrompt(
  data: Awaited<ReturnType<typeof getFinancialSnapshot>>
): string {
  const eur = (n: number) => `€${Math.abs(n).toFixed(2)}`;
  const signed = (n: number) => (n >= 0 ? `+€${n.toFixed(2)}` : `-€${Math.abs(n).toFixed(2)}`);

  // Accounts
  const assets = data.accounts.filter((a) => a.nature === "asset");
  const liabilities = data.accounts.filter((a) => a.nature === "liability");

  const accountLines = (accs: typeof data.accounts) =>
    accs
      .map((a) => {
        const bal = Number(a.base_eur) + Number(a.activity_eur);
        return `  ${a.name.padEnd(20)} ${signed(bal)}`;
      })
      .join("\n");

  const totalLiquid = assets.reduce(
    (s, a) => s + Number(a.base_eur) + Number(a.activity_eur),
    0
  );
  const totalOwed = liabilities.reduce(
    (s, a) => s + Number(a.base_eur) + Number(a.activity_eur),
    0
  );

  // Category split
  const lastMap = new Map(data.lastMonth.map((r) => [r.category, Number(r.total)]));
  const income = data.thisMonth.filter((r) => Number(r.total) > 0);
  const expenses = data.thisMonth.filter((r) => Number(r.total) < 0);
  const totalIn = income.reduce((s, r) => s + Number(r.total), 0);
  const totalOut = expenses.reduce((s, r) => s + Number(r.total), 0);
  const net = totalIn + totalOut;

  const expenseLines = expenses
    .sort((a, b) => Number(a.total) - Number(b.total))
    .map((r) => {
      const last = lastMap.get(r.category);
      let change = "";
      if (last != null && last !== 0) {
        const diff = Number(r.total) - last; // both negative → more negative = more spending
        const pct = Math.round((Math.abs(diff) / Math.abs(last)) * 100);
        change = diff < 0 ? ` (▲ ${pct}% vs last month)` : ` (▼ ${pct}% vs last month)`;
      }
      return `  ${r.category.padEnd(22)} ${eur(Number(r.total))}${change}`;
    })
    .join("\n");

  const incomeLines = income
    .map((r) => `  ${r.category.padEnd(22)} ${signed(Number(r.total))}`)
    .join("\n");

  const topTxLines = data.topTx
    .map(
      (t) =>
        `  ${t.date}  ${(t.description ?? "").slice(0, 35).padEnd(35)}  ${signed(Number(t.amount_eur))}  [${t.category}]`
    )
    .join("\n");

  const recurringLines =
    data.recurring.length > 0
      ? data.recurring
          .map(
            (r) =>
              `  ${r.name.padEnd(25)} ${signed(-Math.abs(Number(r.amount)))} ${r.currency}/${r.frequency ?? "mo"}`
          )
          .join("\n")
      : "  (none recorded)";

  const budgetLines =
    data.budgets.length > 0
      ? data.budgets
          .map((c) => {
            const actual = Math.abs(
              Number(expenses.find((e) => e.category === c.name)?.total ?? 0)
            );
            const budget = Number(c.monthly_budget);
            const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0;
            const status = pct > 100 ? " ⚠ OVER" : pct > 80 ? " ⚡ near limit" : "";
            return `  ${c.name.padEnd(22)} €${actual.toFixed(0)} / €${budget.toFixed(0)} (${pct}%)${status}`;
          })
          .join("\n")
      : "";

  return `You are a personal finance advisor embedded in the user's own finance tracking app. You have access to their real, live financial data below. Be direct and specific — cite actual numbers. Be concise and actionable, not preachy. Skip generic advice; focus on what THIS person's data shows. Use plain text with newlines for lists (no markdown symbols like ** or ##). Keep responses focused and under 300 words unless the user asks for detail.

════════════════════════════════════════
FINANCIAL SNAPSHOT — ${data.monthName}
════════════════════════════════════════

LIQUID ACCOUNTS (assets)
${accountLines(assets) || "  (none)"}
  ────────────────────────────────────
  Total liquid:          ${signed(totalLiquid)}
${
  liabilities.length > 0
    ? `\nCREDIT / LIABILITIES\n${accountLines(liabilities)}\n  Total owed:            ${signed(totalOwed)}`
    : ""
}

INCOME THIS MONTH
${incomeLines || "  (none recorded yet)"}
  Total in:              ${signed(totalIn)}

SPENDING BY CATEGORY
${expenseLines || "  (none recorded yet)"}
  ────────────────────────────────────
  Total out:             ${signed(totalOut)}

NET THIS MONTH:          ${signed(net)}
${net >= 0 ? "→ Saving month ✓" : "→ Spending more than earning"}
${
  budgetLines
    ? `\nBUDGET TRACKING\n${budgetLines}`
    : ""
}

TOP TRANSACTIONS THIS MONTH
${topTxLines || "  (none yet)"}

RECURRING COMMITMENTS
${recurringLines}
════════════════════════════════════════`;
}

// Pure formatting — no "use server" needed here
import { type getFinancialSnapshot } from "./actions";

export function buildSystemPrompt(
  data: Awaited<ReturnType<typeof getFinancialSnapshot>>
): string {
  const eur = (n: number) => `€${Math.abs(n).toFixed(2)}`;
  const signed = (n: number) =>
    n >= 0 ? `+€${n.toFixed(2)}` : `-€${Math.abs(n).toFixed(2)}`;

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
        const diff = Number(r.total) - last;
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
        `  ${t.date}  ${(t.description ?? "").slice(0, 35).padEnd(35)}  ${signed(
          Number(t.amount_eur)
        )}  [${t.category}]`
    )
    .join("\n");

  const recurringLines =
    data.recurring.length > 0
      ? data.recurring
          .map(
            (r) =>
              `  ${r.name.padEnd(25)} ${signed(-Math.abs(Number(r.amount)))} ${
                r.currency
              }/${r.frequency ?? "mo"}`
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

  // ── Full transaction ledger (compact, for granular Q&A) ─────────────
  // Cached in system prompt — follow-up messages pay ~10% of this cost.
  const txLines = data.allTransactions
    .map((t) => {
      const amt = signed(Number(t.eur));
      const cur = t.original_currency !== "EUR"
        ? ` (${t.original_currency} ${Number(t.native_amount).toFixed(2)})`
        : "";
      const tag = t.tag ? ` #${t.tag}` : "";
      const desc = (t.description ?? "").slice(0, 50);
      return `${t.date}  ${amt.padStart(10)}  ${t.category.padEnd(20)}  ${t.account.padEnd(14)}  ${desc}${cur}${tag}`;
    })
    .join("\n");

  return `You are a personal finance advisor embedded in the user's own finance tracking app. You have full access to their real, live financial data — including every individual transaction — listed below. Be direct and specific; cite actual numbers and merchant names from the data. Be concise and actionable. Use plain text with newlines for lists (no markdown like ** or ##). For specific questions ("how much did I spend on Wolt?") scan the FULL TRANSACTION LEDGER and sum the matching rows precisely.

════════════════════════════════════════
FINANCIAL SNAPSHOT — ${data.periodLabel}
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

INCOME THIS PERIOD
${incomeLines || "  (none recorded yet)"}
  Total in:              ${signed(totalIn)}

SPENDING BY CATEGORY
${expenseLines || "  (none recorded yet)"}
  ────────────────────────────────────
  Total out:             ${signed(totalOut)}

NET THIS PERIOD:         ${signed(net)}
${net >= 0 ? "→ Saving period ✓" : "→ Spending more than earning"}
${budgetLines ? `\nBUDGET TRACKING\n${budgetLines}` : ""}

RECURRING COMMITMENTS
${recurringLines}

════════════════════════════════════════
FULL TRANSACTION LEDGER (${data.allTransactions.length} transactions)
date        amount      category              account         description
────────────────────────────────────────────────────────────────────────
${txLines || "  (none)"}
════════════════════════════════════════`;
}

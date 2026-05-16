import { sql } from "@/lib/db";
import Link from "next/link";
import { bankLogo } from "@/lib/bank-logo";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { buildPeriodList } from "@/lib/periods";
import { AccountTransactionsSection } from "./transactions-section";

export const revalidate = 0;

export default async function AccountDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: accountId } = await props.params;

  const { start, end, key } = await fetchCurrentCycle();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const periods = buildPeriodList(startStr, endStr, key);

  const [account] = await sql`SELECT * FROM accounts WHERE id = ${accountId}`;

  const [transactions, categoriesRows, allAccounts, txSum] = await Promise.all([
    sql`
      SELECT * FROM transactions
      WHERE account_id = ${accountId}
        AND date >= ${startStr} AND date <= ${endStr}
      ORDER BY date DESC
    `,
    sql`SELECT id, name FROM categories ORDER BY name ASC`,
    sql`SELECT id, name, currency FROM accounts WHERE status = 'active'`,
    sql`
      SELECT
        COALESCE(SUM(amount), 0) AS native_total,
        COALESCE(SUM(amount_eur), 0) AS eur_total
      FROM transactions WHERE account_id = ${accountId}
    `,
  ]);

  const categories = categoriesRows.map((c: any) => c.name);
  const balance = Number(account.initial_balance) + Number(txSum[0].native_total);

  // EUR balance (shown prominently)
  const eurBase =
    account.initial_balance_eur != null
      ? Number(account.initial_balance_eur)
      : account.currency === "EUR"
      ? Number(account.initial_balance)
      : null;
  const balanceEur = eurBase != null ? eurBase + Number(txSum[0].eur_total) : null;

  const uncategorizedCount = transactions.filter(
    (t: any) => !t.category || t.category.trim() === "" || t.category === "Uncategorized",
  ).length;

  const logo = bankLogo(account.name);
  const currency = account.currency || "EUR";
  const isLiability = account.nature === "liability";

  const fmt = (n: number, cur = currency) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const isNonEur = currency !== "EUR";

  // Credit card
  const creditLimit = Number(account.credit_limit ?? 0);
  const used = Math.abs(Math.min(balance, 0));
  const available = creditLimit > 0 ? Math.max(0, creditLimit - used) : null;
  const creditPct = creditLimit > 0 ? Math.min(100, Math.round((used / creditLimit) * 100)) : 0;
  const interestRate = Number(account.interest_rate ?? 0);
  const monthlyInterest = interestRate > 0 ? used * (interestRate / 100 / 12) : 0;

  // Loan
  const loanOriginal = Number(account.loan_original_amount ?? 0);
  const loanRemaining = Math.abs(Math.min(balance, 0));
  const loanRepaid = loanOriginal > 0 ? Math.max(0, loanOriginal - loanRemaining) : 0;
  const loanPct = loanOriginal > 0 ? Math.min(100, Math.round((loanRepaid / loanOriginal) * 100)) : 0;
  const monthlyPayment = Number(account.monthly_payment ?? 0);
  let payoffLabel: string | null = null;
  if (monthlyPayment > 0 && loanRemaining > 0) {
    const monthsLeft = Math.ceil(loanRemaining / monthlyPayment);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsLeft);
    payoffLabel = payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      {/* Account card header */}
      <div className="rounded-xl bg-white shadow-[var(--shadow-softer)] overflow-hidden max-w-sm">
        <div className="h-1" style={{ backgroundColor: account.color || logo.bg }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 select-none"
              style={{ backgroundColor: logo.bg, color: logo.fg }}
            >
              {logo.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{account.name}</p>
              <p className="text-[11px] text-slate-400">{account.type} · {currency}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 mb-0.5">
              {account.type === "Credit Card" ? "Current balance" :
               account.type === "Loan"        ? "Remaining debt" :
                                                "Available balance"}
            </p>
            {balanceEur != null ? (
              <>
                <p className={`text-2xl font-bold tabular-nums ${isLiability ? "text-rose-600" : "text-slate-900"}`}>
                  {fmt(balanceEur, "EUR")}
                </p>
                {isNonEur && (
                  <p className="text-[11px] text-slate-400 tabular-nums">{fmt(balance)}</p>
                )}
              </>
            ) : (
              <>
                <p className={`text-2xl font-bold tabular-nums ${isLiability ? "text-rose-600" : "text-slate-900"}`}>
                  {fmt(balance)}
                </p>
                {isNonEur && (
                  <p className="text-[10px] text-amber-500 mt-0.5">Set EUR balance in Edit</p>
                )}
              </>
            )}
          </div>

          {account.type === "Credit Card" && (creditLimit > 0 || monthlyInterest > 0) && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              {creditLimit > 0 && (
                <>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Used {fmt(used)}</span>
                    <span>Limit {fmt(creditLimit)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${creditPct}%`,
                        backgroundColor: creditPct > 80 ? "#ef4444" : creditPct > 50 ? "#f97316" : "#22c55e",
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">{fmt(available!)} available · {creditPct}% used</p>
                </>
              )}
              {monthlyInterest > 0 && (
                <p className="text-[11px] text-amber-600 font-medium">
                  ~{fmt(monthlyInterest)} interest this month
                </p>
              )}
            </div>
          )}

          {account.type === "Loan" && loanOriginal > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Repaid {fmt(loanRepaid)}</span>
                <span>Total {fmt(loanOriginal)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${loanPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{loanPct}% repaid · {fmt(loanRemaining)} left</span>
                {payoffLabel && (
                  <span className="text-slate-500 font-medium">Est. payoff {payoffLabel}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-4">
          <Link href="/accounts" className="text-xs text-slate-400 hover:text-slate-700 transition">
            ← Back to Accounts
          </Link>
        </div>
      </div>

      <AccountTransactionsSection
        accountId={accountId}
        initialTransactions={transactions as any[]}
        periods={periods}
        currentCycleKey={key}
        categories={categories}
        accounts={allAccounts.map((a: any) => ({ id: a.id, name: a.name, currency: a.currency || "EUR" }))}
        uncategorizedCount={uncategorizedCount}
      />
    </main>
  );
}

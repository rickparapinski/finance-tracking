import { sql } from "@/lib/db";
import Link from "next/link";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import { buildPeriodList } from "@/lib/periods";
import { slugify } from "@/lib/slugify";
import { Segs } from "@/components/ui/segs";
import { AccountIcon } from "@/components/icons/AccountIcon";
import { PageHeader } from "@/components/layout/page-header";
import { AccountTransactionsSection } from "./transactions-section";

export const revalidate = 0;

export default async function AccountDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const { start, end, key } = await fetchCurrentCycle();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const periods = buildPeriodList(startStr, endStr, key);

  const accounts = await sql`SELECT * FROM accounts`;
  const account = accounts.find((a: any) => slugify(a.name) === slug);
  if (!account) return <main className="p-8 font-mono text-sm text-ink">account not found.</main>;
  const accountId: string = account.id;

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

  const currency = account.currency || "EUR";
  const isNonEur = currency !== "EUR";
  const isLiability = account.nature === "liability";

  const fmt = (n: number, cur = currency) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  // Credit card
  const creditLimit = Number(account.credit_limit ?? 0);
  const creditUsed = Math.abs(Math.min(balance, 0));
  const creditAvailable = creditLimit > 0 ? Math.max(0, creditLimit - creditUsed) : null;
  const creditPct = creditLimit > 0 ? Math.min(100, Math.round((creditUsed / creditLimit) * 100)) : 0;
  const creditFilled = Math.round((creditPct / 100) * 8);
  const isOverUtilized = account.type === "Credit Card" && creditPct >= 80;
  const interestRate = Number(account.interest_rate ?? 0);
  const monthlyInterest = interestRate > 0 ? creditUsed * (interestRate / 100 / 12) : 0;

  // Loan
  const loanOriginal = Number(account.loan_original_amount ?? 0);
  const loanRemaining = Math.abs(Math.min(balance, 0));
  const loanRepaid = loanOriginal > 0 ? Math.max(0, loanOriginal - loanRemaining) : 0;
  const loanPct = loanOriginal > 0 ? Math.min(100, Math.round((loanRepaid / loanOriginal) * 100)) : 0;
  const loanFilled = Math.round((loanPct / 100) * 8);
  const monthlyPayment = Number(account.monthly_payment ?? 0);
  let payoffLabel: string | null = null;
  if (monthlyPayment > 0 && loanRemaining > 0) {
    const monthsLeft = Math.ceil(loanRemaining / monthlyPayment);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsLeft);
    payoffLabel = payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // Design tokens that flip when over-utilized
  const cardBg      = isOverUtilized ? "bg-ink"        : "bg-surface";
  const textPrimary = isOverUtilized ? "text-cream-soft"    : "text-ink";
  const textSecond  = isOverUtilized ? "text-cream-soft/60" : "text-ink-soft";
  const borderSplit = isOverUtilized ? "border-cream-soft/10" : "border-ink/10";

  const balanceLabel =
    account.type === "Credit Card" ? "current balance" :
    account.type === "Loan"        ? "remaining debt"  :
                                     "available balance";

  const displayBalance  = balanceEur != null ? balanceEur : balance;
  const displayCurrency = balanceEur != null ? "EUR" : currency;

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Breadcrumb ── */}
      <Link
        href="/accounts"
        className="font-mono text-xs text-ink-soft hover:text-ink transition-none"
      >
        ← accounts
      </Link>

      {/* Page header — breadcrumb already above (P2-4 pattern) */}
      <PageHeader
        title={account.name}
        icon={
          <AccountIcon
            type={account.type}
            className={`w-7 h-7 shrink-0 ${isOverUtilized ? "text-cream-soft" : "text-ink"}`}
          />
        }
        meta={`${account.type.toLowerCase()} · ${currency}${isOverUtilized ? " · over-utilized" : ""}`}
      />

      {/* ── Account stats card ── */}
      <div className={`${cardBg} border-2 border-ink shadow-[4px_4px_0_#1F1F1F] overflow-hidden`}>
        {/* Balance row */}
        <div className="px-5 py-4">
          <p className={`font-mono text-xs ${textSecond} mb-1`}>{balanceLabel}</p>
          <p className={`font-mono text-3xl tabular-nums ${textPrimary}`}>
            {fmt(displayBalance, displayCurrency)}
          </p>
          {balanceEur != null && isNonEur && (
            <p className={`font-mono text-sm tabular-nums ${textSecond} mt-0.5`}>
              {fmt(balance)}
            </p>
          )}
          {balanceEur == null && isNonEur && (
            <p className={`font-mono text-xs ${textSecond} mt-0.5`}>
              set eur balance in edit
            </p>
          )}
        </div>

        {/* ── Credit card section ── */}
        {account.type === "Credit Card" && creditLimit > 0 && (
          <div className={`px-5 py-4 border-t ${borderSplit} space-y-2`}>
            <div className={`flex justify-between font-mono text-xs ${textSecond}`}>
              <span>used {fmt(creditUsed, currency)}</span>
              <span>limit {fmt(creditLimit, currency)}</span>
            </div>
            <Segs filled={creditFilled} dark={isOverUtilized} />
            <div className={`flex justify-between font-mono text-xs ${textSecond}`}>
              <span>{fmt(creditAvailable!, currency)} available · {creditPct}% used</span>
              {monthlyInterest > 0 && (
                <span className={isOverUtilized ? "text-[#F5C842]" : "text-ink"}>
                  ~{fmt(monthlyInterest, currency)} interest/mo
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Loan section ── */}
        {account.type === "Loan" && loanOriginal > 0 && (
          <div className={`px-5 py-4 border-t ${borderSplit} space-y-2`}>
            <div className={`flex justify-between font-mono text-xs ${textSecond}`}>
              <span>repaid {fmt(loanRepaid, currency)}</span>
              <span>total {fmt(loanOriginal, currency)}</span>
            </div>
            <Segs filled={loanFilled} dark={false} />
            <div className={`flex justify-between font-mono text-xs ${textSecond}`}>
              <span>{loanPct}% repaid · {fmt(loanRemaining, currency)} left</span>
              {payoffLabel && (
                <span className={textPrimary}>est. payoff {payoffLabel}</span>
              )}
            </div>
            {monthlyPayment > 0 && (
              <p className={`font-mono text-xs ${textSecond}`}>
                {fmt(monthlyPayment, currency)}/mo payment
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Transactions ── */}
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

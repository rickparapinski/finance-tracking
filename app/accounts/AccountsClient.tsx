"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { upsertAccount, archiveAccount, restoreAccount } from "./actions";
import { EditAccountModal, Account } from "./edit-modal";
import { useHideBalances } from "@/contexts/hide-balances";
import { Segs } from "@/components/ui/segs";
import { AccountIcon } from "@/components/icons/AccountIcon";
import { slugify } from "@/lib/slugify";
import { Nah } from "@/components/Nah";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fixed section order: checking → credit cards → loans */
const SECTIONS: Array<{ types: string[]; label: string }> = [
  { types: ["Checking", "Savings", "Investment"], label: "checking" },
  { types: ["Credit Card"],                       label: "credit cards" },
  { types: ["Loan"],                              label: "loans" },
];

const CLOSE_DURATION = 200; // must match animate-reveal-up in globals.css

const labelCls =
  "block text-xs font-mono text-ink-soft mb-1";
const inputCls =
  "h-9 w-full border-2 border-ink bg-white px-3 text-sm text-ink " +
  "placeholder:text-ink/30 focus:outline-none focus:border-ink/70 transition-none";

// ── Main component ────────────────────────────────────────────────────────────

export default function AccountsClient({ accounts }: { accounts: Account[] }) {
  const [open, setOpen]               = React.useState(false);
  const [closing, setClosing]         = React.useState(false);
  const [isPending, startTransition]  = React.useTransition();
  const [selected, setSelected]       = React.useState<Account | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const formRef                       = React.useRef<HTMLFormElement>(null);

  // Only show non-archived accounts
  const visibleAccounts = accounts.filter(
    (a) => (a.status ?? "active") !== "archived",
  );

  // ── Close animation (matches TransactionsTop pattern exactly) ──
  const doClose = React.useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_DURATION);
  }, [closing]);

  const toggle = () => {
    if (open) doClose();
    else setOpen(true);
  };

  // Escape key collapses the form
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) doClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, doClose]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await upsertAccount(fd);
      doClose();
      formRef.current?.reset();
    });
  };

  const openEdit  = (acc: Account) => { setSelected(acc); setIsModalOpen(true); };
  const closeEdit = () => { setIsModalOpen(false); setSelected(null); };

  return (
    <div className="space-y-6">
      <EditAccountModal account={selected} isOpen={isModalOpen} onClose={closeEdit} />

      {/* ── Header ── */}
      <PageHeader
        title="accounts"
        meta="what you have, what you owe"
        action={
          <button
            onClick={toggle}
            className={
              open
                ? "h-8 px-3 flex items-center gap-1 bg-surface border-2 border-ink text-ink font-mono text-[11px] shadow-[2px_2px_0_#1F1F1F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none"
                : "h-8 px-3 flex items-center gap-1 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-none"
            }
          >
            {open ? <><X size={11} className="shrink-0" />cancel</> : "+ new"}
          </button>
        }
      />

      {/* ── Collapsible quick-add form (matches TransactionsTop pattern) ───── */}
      {open && (
        <div
          className={`bg-surface border-2 border-ink overflow-hidden ${
            closing ? "animate-reveal-up" : "animate-reveal-down"
          }`}
        >
          <div className="flex items-center px-4 py-2 border-b-2 border-ink/10 bg-ink/[0.02]">
            <span className="font-mono text-xs text-ink-soft">quick add</span>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="p-4 space-y-3">
            <input type="hidden" name="id" value="" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Revolut Main"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>currency</label>
                <select name="currency" className={inputCls}>
                  <option value="EUR">EUR</option>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>type</label>
                <select name="type" className={inputCls}>
                  <option value="Checking">Checking</option>
                  <option value="Savings">Savings</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Investment">Investment</option>
                  <option value="Loan">Loan</option>
                </select>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="w-40 shrink-0">
                <label className={labelCls}>start bal.</label>
                <input
                  name="initial_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={doClose}
                  className="h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:bg-cream-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F] transition-none"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-8 px-3 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-none"
                >
                  {isPending ? "saving…" : "save account"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Account sections ─────────────────────────────────────────────────── */}
      {visibleAccounts.length === 0 ? (
        <div className="border-2 border-ink/10 bg-surface p-12 text-center font-mono text-xs text-ink-soft">
          no accounts yet. create one to get started.
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map(({ types, label }) => {
            const accs = visibleAccounts.filter((a) => types.includes(a.type));
            if (accs.length === 0) return null;
            return (
              <section key={label} className="space-y-3">
                {/* Section label — matches income/expenses on categories page */}
                <h2 className="font-mono text-xs text-ink-soft">{label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {accs.map((acc) => (
                    <AccountCard key={acc.id} account={acc} onEdit={openEdit} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({
  account: acc,
  onEdit,
}: {
  account: Account;
  onEdit: (acc: Account) => void;
}) {
  const isArchived = (acc.status ?? "active") === "archived";
  const balance    = acc.balance ?? Number(acc.initial_balance);
  const balanceEur = acc.balance_eur;
  const currency   = acc.currency || "EUR";
  const isNonEur   = currency !== "EUR";
  const { hidden } = useHideBalances();

  const fmt = (n: number, cur = "EUR") =>
    hidden
      ? "••••••"
      : new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: cur,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n);

  // ── Credit card utilization (computed here so card shell can react) ──
  const creditLimit  = Number(acc.credit_limit ?? 0);
  const creditUsed   = Math.abs(Math.min(balance, 0));
  const creditPct    = creditLimit > 0
    ? Math.min(100, Math.round((creditUsed / creditLimit) * 100))
    : 0;
  const creditFilled = Math.round((creditPct / 100) * 8);
  const isOverUtilized = acc.type === "Credit Card" && creditPct >= 80;

  // ── Conditional design tokens ──
  const textPrimary   = isOverUtilized ? "text-cream-soft"    : "text-ink";
  const textSecondary = isOverUtilized ? "text-cream-soft/60" : "text-ink-soft";
  const borderSplit   = isOverUtilized ? "border-cream-soft/10" : "border-ink/10";

  const btnFooter = isOverUtilized
    ? "h-8 border-2 border-cream-soft/20 text-cream-soft/60 font-mono text-[11px] px-3 hover:border-cream-soft/50 hover:text-cream-soft active:translate-x-[2px] active:translate-y-[2px] transition-none"
    : "h-8 bg-surface border-2 border-ink text-ink font-mono text-[11px] px-3 shadow-[4px_4px_0_#1F1F1F] hover:bg-cream-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F] transition-none";

  // Balance label
  const balanceLabel =
    acc.type === "Credit Card" ? "current balance" :
    acc.type === "Loan"        ? "remaining debt"  :
                                 "available balance";

  // Primary display amount — prefer EUR, fall back to native
  const displayBalance  = balanceEur != null ? balanceEur : balance;
  const displayCurrency = balanceEur != null ? "EUR" : currency;
  const showNativeLine  = balanceEur != null && isNonEur;

  return (
    <div
      className={`w-full border-2 border-ink overflow-hidden flex flex-col shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] transition-none ${
        isOverUtilized ? "bg-ink" : "bg-surface"
      } ${isArchived ? "opacity-60" : ""}`}
    >
      <Link href={`/accounts/${slugify(acc.name)}`} className="flex-1 p-4 flex flex-col gap-3">

        {/* ── Header: type icon + name + type + over-utilized chip ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Account type icon — cream on charcoal, ink on white */}
            <AccountIcon
              type={acc.type}
              className={`w-6 h-6 shrink-0 ${isOverUtilized ? "text-[#F4EFE3]" : "text-ink"}`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-pixel text-base ${textPrimary} lowercase truncate`}>
                  {acc.name}
                </span>
                {isArchived && (
                  <span className={`font-mono text-[10px] ${textSecondary} shrink-0`}>
                    archived
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Over-utilized — disappointed Nah replaces lime text (lime = positive, P3-3) */}
          {isOverUtilized && <Nah expression="disappointed" size={48} />}
        </div>

        {/* ── Balance ── */}
        <div>
          <p className={`font-mono text-xs ${textSecondary} mb-0.5`}>
            {balanceLabel}
          </p>
          <p className={`font-mono text-xl tabular-nums ${textPrimary}`}>
            {fmt(displayBalance, displayCurrency)}
          </p>
          {/* Non-EUR native conversion line */}
          {showNativeLine && (
            <p className={`font-mono text-sm tabular-nums ${textSecondary} mt-0.5`}>
              {fmt(balance, currency)}
            </p>
          )}
          {/* EUR balance not set — prompt to edit */}
          {balanceEur == null && isNonEur && (
            <p className={`font-mono text-xs ${textSecondary} mt-0.5`}>
              set eur balance in edit
            </p>
          )}
        </div>

        {/* ── Type-specific sections ── */}
        {acc.type === "Credit Card" && creditLimit > 0 && (
          <CreditCardSection
            acc={acc}
            balance={balance}
            currency={currency}
            fmt={fmt}
            creditPct={creditPct}
            creditFilled={creditFilled}
            creditUsed={creditUsed}
            creditLimit={creditLimit}
            isOverUtilized={isOverUtilized}
            textSecondary={textSecondary}
            borderSplit={borderSplit}
          />
        )}

        {acc.type === "Loan" && (
          <LoanSection
            acc={acc}
            balance={balance}
            currency={currency}
            fmt={fmt}
            textSecondary={textSecondary}
            borderSplit={borderSplit}
          />
        )}
      </Link>

      {/* ── Footer actions ── */}
      <div className={`px-4 pb-3 pt-2 flex items-center justify-end gap-2 border-t ${borderSplit}`}>
        <button onClick={() => onEdit(acc)} className={btnFooter}>
          edit
        </button>
        {isArchived ? (
          <form action={restoreAccount.bind(null, acc.id)}>
            <button className={btnFooter}>restore</button>
          </form>
        ) : (
          <form action={archiveAccount.bind(null, acc.id)}>
            <button className={btnFooter}>archive</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Credit card section ───────────────────────────────────────────────────────

function CreditCardSection({
  acc,
  balance,
  currency,
  fmt,
  creditPct,
  creditFilled,
  creditUsed,
  creditLimit,
  isOverUtilized,
  textSecondary,
  borderSplit,
}: {
  acc: Account;
  balance: number;
  currency: string;
  fmt: (n: number, cur?: string) => string;
  creditPct: number;
  creditFilled: number;
  creditUsed: number;
  creditLimit: number;
  isOverUtilized: boolean;
  textSecondary: string;
  borderSplit: string;
}) {
  const available      = Math.max(0, creditLimit - creditUsed);
  const interestRate   = Number(acc.interest_rate ?? 0);
  const monthlyInterest = interestRate > 0
    ? creditUsed * (interestRate / 100 / 12)
    : 0;

  return (
    <div className={`space-y-2 border-t ${borderSplit} pt-3`}>
      {/* used / limit pair */}
      <div className={`flex justify-between font-mono text-xs ${textSecondary}`}>
        <span>used {fmt(creditUsed, currency)}</span>
        <span>limit {fmt(creditLimit, currency)}</span>
      </div>

      {/* 8-segment bar — lime = available credit (inverted: full lime = all available, empty = maxed) */}
      <Segs filled={8 - creditFilled} dark={isOverUtilized} />

      {/* available · % used */}
      <p className={`font-mono text-xs ${textSecondary}`}>
        {fmt(available, currency)} available · {creditPct}% used
      </p>

      {/* Interest line — gold on charcoal, ink on white */}
      {monthlyInterest > 0 && (
        <p className={`font-mono text-xs ${isOverUtilized ? "text-[#F5C842]" : "text-ink"}`}>
          ~{fmt(monthlyInterest, currency)} interest this month
        </p>
      )}
    </div>
  );
}

// ── Loan section ──────────────────────────────────────────────────────────────

function LoanSection({
  acc,
  balance,
  currency,
  fmt,
  textSecondary,
  borderSplit,
}: {
  acc: Account;
  balance: number;
  currency: string;
  fmt: (n: number, cur?: string) => string;
  textSecondary: string;
  borderSplit: string;
}) {
  const original   = Number(acc.loan_original_amount ?? 0);
  const remaining  = Math.abs(Math.min(balance, 0));
  const repaid     = original > 0 ? Math.max(0, original - remaining) : 0;
  const pct        = original > 0
    ? Math.min(100, Math.round((repaid / original) * 100))
    : 0;
  const filled     = Math.round((pct / 100) * 8);
  const monthlyPayment = Number(acc.monthly_payment ?? 0);

  // Est. payoff date
  let payoffLabel: string | null = null;
  if (monthlyPayment > 0 && remaining > 0) {
    const monthsLeft = Math.ceil(remaining / monthlyPayment);
    const d = new Date();
    d.setMonth(d.getMonth() + monthsLeft);
    payoffLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  if (original <= 0) return null;

  return (
    <div className={`space-y-2 border-t ${borderSplit} pt-3`}>
      {/* repaid / total pair */}
      <div className={`flex justify-between font-mono text-xs ${textSecondary}`}>
        <span>repaid {fmt(repaid, currency)}</span>
        <span>total {fmt(original, currency)}</span>
      </div>

      {/* 8-segment lime bar — positive direction (freedom progress) */}
      <Segs filled={filled} dark={false} />

      {/* % repaid · left + est. payoff */}
      <div className="flex items-baseline justify-between gap-2">
        <p className={`font-mono text-xs ${textSecondary}`}>
          {pct}% repaid · {fmt(remaining, currency)} left
        </p>
        {payoffLabel && (
          /* est. payoff is the most important line — keep it text-ink */
          <p className="font-mono text-xs text-ink shrink-0">
            est. payoff {payoffLabel}
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { archiveAccount, restoreAccount } from "./actions";
import { EditAccountModal, Account } from "./edit-modal";
import { bankLogo } from "@/lib/bank-logo";
import { useHideBalances } from "@/contexts/hide-balances";

export default function AccountsClient({ accounts }: { accounts: Account[] }) {
  const [showArchived, setShowArchived] = React.useState(false);
  const [selected, setSelected] = React.useState<Account | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const TYPE_ORDER = ["Checking", "Savings", "Investment", "Credit Card", "Loan"];

  const visibleAccounts = React.useMemo(() => {
    const list = showArchived
      ? accounts
      : accounts.filter((a) => (a.status ?? "active") !== "archived");
    return list.slice().sort(
      (a, b) =>
        (TYPE_ORDER.indexOf(a.type) === -1 ? 99 : TYPE_ORDER.indexOf(a.type)) -
        (TYPE_ORDER.indexOf(b.type) === -1 ? 99 : TYPE_ORDER.indexOf(b.type)),
    );
  }, [accounts, showArchived]);

  const groups = React.useMemo(() => {
    const map = new Map<string, Account[]>();
    for (const acc of visibleAccounts) {
      const group = map.get(acc.type) ?? [];
      group.push(acc);
      map.set(acc.type, group);
    }
    return [...map.entries()];
  }, [visibleAccounts]);

  const openEdit = (acc: Account) => {
    setSelected(acc);
    setIsModalOpen(true);
  };

  const closeEdit = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-slate-700"
          />
          Show archived
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center text-slate-500 text-sm shadow-[var(--shadow-softer)]">
          No accounts found.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([type, accs]) => (
            <section key={type} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {type}s
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {accs.map((acc) => (
                  <AccountCard key={acc.id} account={acc} onEdit={openEdit} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EditAccountModal
        account={selected}
        isOpen={isModalOpen}
        onClose={closeEdit}
      />
    </div>
  );
}

function AccountCard({
  account: acc,
  onEdit,
}: {
  account: Account;
  onEdit: (acc: Account) => void;
}) {
  const logo = bankLogo(acc.name);
  const isArchived = (acc.status ?? "active") === "archived";
  const balance = acc.balance ?? Number(acc.initial_balance);
  const balanceEur = acc.balance_eur;
  const currency = acc.currency || "EUR";
  const isNonEur = currency !== "EUR";
  const { hidden } = useHideBalances();

  const fmt = (n: number, cur = "EUR") =>
    hidden ? "••••••" :
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div
      className={`rounded-xl bg-white shadow-[var(--shadow-softer)] overflow-hidden flex flex-col ${
        isArchived ? "opacity-60" : ""
      }`}
    >
      {/* Color stripe */}
      <div className="h-1" style={{ backgroundColor: acc.color || logo.bg }} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row: logo + name + type */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 select-none"
            style={{ backgroundColor: logo.bg, color: logo.fg }}
          >
            {logo.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {acc.name}
              </span>
              {isArchived && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                  Archived
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">{acc.type}</span>
          </div>
        </div>

        {/* Balance */}
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">
            {acc.type === "Credit Card" ? "Current balance" :
             acc.type === "Loan"        ? "Remaining debt" :
                                          "Available balance"}
          </p>
          {balanceEur != null ? (
            <>
              <p className={`text-xl font-bold tabular-nums ${acc.nature === "liability" ? "text-rose-600" : "text-slate-900"}`}>
                {fmt(balanceEur, "EUR")}
              </p>
              {isNonEur && (
                <p className="text-[11px] text-slate-400 tabular-nums">
                  {fmt(balance, currency)}
                </p>
              )}
            </>
          ) : (
            <>
              <p className={`text-xl font-bold tabular-nums ${acc.nature === "liability" ? "text-rose-600" : "text-slate-900"}`}>
                {fmt(balance, currency)}
              </p>
              {isNonEur && (
                <p className="text-[10px] text-amber-500 mt-0.5">Set EUR balance in Edit</p>
              )}
            </>
          )}
        </div>

        {/* Type-specific section */}
        {acc.type === "Credit Card" && (
          <CreditCardSection acc={acc} balance={balance} currency={currency} fmt={fmt} />
        )}
        {acc.type === "Loan" && (
          <LoanSection acc={acc} balance={balance} currency={currency} fmt={fmt} />
        )}
      </div>

      {/* Actions footer */}
      <div className="px-5 pb-4 flex items-center justify-between gap-2 mt-auto">
        <Link
          href={`/accounts/${acc.id}`}
          className="text-xs text-slate-500 hover:text-slate-900 transition"
        >
          View transactions →
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(acc)}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            Edit
          </button>
          {isArchived ? (
            <form action={restoreAccount.bind(null, acc.id)}>
              <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition">
                Restore
              </button>
            </form>
          ) : (
            <form action={archiveAccount.bind(null, acc.id)}>
              <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                Archive
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function CreditCardSection({
  acc,
  balance,
  currency,
  fmt,
}: {
  acc: Account;
  balance: number;
  currency: string;
  fmt: (n: number, cur?: string) => string;
}) {
  const limit = Number(acc.credit_limit ?? 0);
  const used = Math.abs(Math.min(balance, 0)); // balance is negative when owed
  const available = limit > 0 ? Math.max(0, limit - used) : null;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const interestRate = Number(acc.interest_rate ?? 0);
  const monthlyInterest = interestRate > 0 ? used * (interestRate / 100 / 12) : 0;

  if (limit <= 0 && interestRate <= 0) return null;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      {limit > 0 && (
        <>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Used {fmt(used, currency)}</span>
            <span>Limit {fmt(limit, currency)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: pct > 80 ? "#ef4444" : pct > 50 ? "#f97316" : "#22c55e",
              }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {fmt(available!, currency)} available · {pct}% used
          </p>
        </>
      )}
      {monthlyInterest > 0 && (
        <p className="text-[11px] text-amber-600 font-medium">
          ~{fmt(monthlyInterest, currency)} interest this month
        </p>
      )}
    </div>
  );
}

function LoanSection({
  acc,
  balance,
  currency,
  fmt,
}: {
  acc: Account;
  balance: number;
  currency: string;
  fmt: (n: number, cur?: string) => string;
}) {
  const original = Number(acc.loan_original_amount ?? 0);
  const remaining = Math.abs(Math.min(balance, 0));
  const repaid = original > 0 ? Math.max(0, original - remaining) : 0;
  const pct = original > 0 ? Math.min(100, Math.round((repaid / original) * 100)) : 0;
  const monthlyPayment = Number(acc.monthly_payment ?? 0);

  let payoffLabel: string | null = null;
  if (monthlyPayment > 0 && remaining > 0) {
    const monthsLeft = Math.ceil(remaining / monthlyPayment);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsLeft);
    payoffLabel = payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  if (original <= 0) return null;

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Repaid {fmt(repaid, currency)}</span>
        <span>Total {fmt(original, currency)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-400">{pct}% repaid · {fmt(remaining, currency)} left</span>
        {payoffLabel && (
          <span className="text-slate-500 font-medium">Est. payoff {payoffLabel}</span>
        )}
      </div>
    </div>
  );
}

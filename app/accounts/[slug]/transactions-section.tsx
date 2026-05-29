"use client";

import { useState, useTransition } from "react";
import { DataTable } from "@/app/transactions/data-table";
import { columnsForAccount } from "./transactions-columns";
import { getAccountTransactions } from "./actions";
import { QuickAddForm } from "@/components/quick-add-form";
import { CycleNavigator } from "@/components/cycle-navigator";
import { Close } from "pixelarticons/react/Close";
import { type Period } from "@/lib/periods";
import { Transaction } from "@/lib/adapters/types";

const CLOSE_DURATION = 200;

export function AccountTransactionsSection({
  accountId,
  initialTransactions,
  periods,
  currentCycleKey,
  categories,
  accounts,
  uncategorizedCount,
}: {
  accountId: string;
  initialTransactions: Transaction[];
  periods: Period[];
  currentCycleKey: string;
  categories: string[];
  accounts: { id: string; name: string; currency: string }[];
  uncategorizedCount: number;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedKey, setSelectedKey]   = useState(currentCycleKey);
  const [isPending, startTransition]    = useTransition();
  const [open, setOpen]                 = useState(false);
  const [closing, setClosing]           = useState(false);

  const handlePeriodChange = (period: Period) => {
    setSelectedKey(period.key);
    startTransition(async () => {
      const data = await getAccountTransactions(accountId, period.start_date, period.end_date);
      setTransactions(data as Transaction[]);
    });
  };

  const refresh = async () => {
    const period = periods.find((p) => p.key === selectedKey) ?? periods[0];
    const data = await getAccountTransactions(accountId, period.start_date, period.end_date);
    setTransactions(data as Transaction[]);
  };

  const doClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, CLOSE_DURATION);
  };

  return (
    <section className="space-y-4">
      {/* Section header: title + cycle nav (P2-5) + inline quick-add toggle (P2-8) */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-pixel text-sm text-ink lowercase">transactions</h2>
          <p className="font-mono text-xs text-ink-soft">{transactions.length} in this period</p>
        </div>

        <div className="flex items-center gap-2">
          <CycleNavigator
            periods={periods}
            currentKey={currentCycleKey}
            selectedKey={selectedKey}
            isPending={isPending}
            onChange={handlePeriodChange}
          />
          {/* Quick-add toggle — same visual grammar as TransactionsTop */}
          <button
            onClick={() => { if (open) doClose(); else setOpen(true); }}
            className={
              open
                ? "flex items-center gap-1.5 h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-[11px] shadow-[2px_2px_0_#1F1F1F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none"
                : "flex items-center gap-1.5 h-8 px-3 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-none"
            }
          >
            {open
              ? <><Close className="size-[11px] shrink-0" />cancel</>
              : <>+ add</>
            }
          </button>
        </div>
      </div>

      {/* Inline quick-add form — same pattern as global transactions page */}
      {open && (
        <div
          className={`bg-surface border-2 border-ink shadow-[4px_4px_0_#1F1F1F] overflow-hidden ${
            closing ? "animate-reveal-up" : "animate-reveal-down"
          }`}
        >
          <div className="flex items-center px-4 py-2 border-b-2 border-ink/10 bg-ink/[0.02]">
            <span className="font-pixel text-xs text-ink-soft">new transaction</span>
          </div>
          <div className="p-4">
            <QuickAddForm
              accounts={accounts}
              categories={categories}
              defaultAccountId={accountId}
              onSuccess={() => { doClose(); refresh(); }}
            />
          </div>
        </div>
      )}

      <DataTable
        columns={columnsForAccount}
        data={transactions}
        categories={categories}
        accounts={accounts}
        uncategorizedCount={uncategorizedCount}
      />
    </section>
  );
}

"use client";

import { useState } from "react";
import { DataTable } from "@/app/transactions/data-table";
import { columnsForAccount } from "./transactions-columns";
import { getAccountTransactions } from "./actions";
import { QuickAddForm } from "@/components/quick-add-form";
import { Close } from "pixelarticons/react/Close";
import { Transaction } from "@/lib/adapters/types";

const CLOSE_DURATION = 200;

export function AccountTransactionsSection({
  accountId,
  initialTransactions,
  cycleFrom,
  cycleTo,
  prevCycleFrom,
  prevCycleTo,
  categories,
  accounts,
  uncategorizedCount,
}: {
  accountId: string;
  initialTransactions: Transaction[];
  cycleFrom: string;
  cycleTo: string;
  prevCycleFrom: string;
  prevCycleTo: string;
  categories: string[];
  accounts: { id: string; name: string; currency: string }[];
  uncategorizedCount: number;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [open, setOpen]                 = useState(false);
  const [closing, setClosing]           = useState(false);

  const refresh = async () => {
    const data = await getAccountTransactions(accountId);
    setTransactions(data as Transaction[]);
  };

  const doClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, CLOSE_DURATION);
  };

  return (
    <section className="space-y-4">
      {/* Section label + quick-add toggle */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-pixel text-sm text-ink lowercase">transactions</h2>
          <p className="font-mono text-xs text-ink-soft">{transactions.length} total</p>
        </div>
        <button
          onClick={() => { if (open) doClose(); else setOpen(true); }}
          className={
            open
              ? "flex items-center gap-1.5 h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-[11px] shadow-[2px_2px_0_#1F1F1F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none"
              : "flex items-center gap-1.5 h-8 px-3 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-none"
          }
        >
          {open ? <><Close className="size-[11px] shrink-0" />cancel</> : <>+ add</>}
        </button>
      </div>

      {/* Inline quick-add form */}
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
              onSuccess={refresh}
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
        cycleFrom={cycleFrom}
        cycleTo={cycleTo}
        prevCycleFrom={prevCycleFrom}
        prevCycleTo={prevCycleTo}
        initialPreset="all"
      />
    </section>
  );
}

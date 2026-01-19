// app/forecast/UnmatchedList.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/finance-utils";
import { linkTransactionToForecast } from "./actions";

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
};

type ForecastItem = {
  id: string;
  date: string;
  amount: number;
  ruleName?: string;
  category?: string;
};

export function UnmatchedList({
  transactions,
  projectedInstances,
}: {
  transactions: Transaction[];
  projectedInstances: ForecastItem[];
}) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async (instanceId: string) => {
    if (!selectedTx) return;
    setIsLinking(true);
    try {
      await linkTransactionToForecast(selectedTx.id, instanceId);
      setSelectedTx(null); // Close modal on success
    } catch (e) {
      console.error(e);
      alert("Failed to link");
    } finally {
      setIsLinking(false);
    }
  };

  if (transactions.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 animate-in slide-in-from-top-4">
        <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
          Unmatched Transactions ({transactions.length})
        </h3>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-200">
          {transactions.map((tx) => (
            <button
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="flex-shrink-0 flex flex-col items-start gap-1 p-3 rounded-lg bg-white border border-amber-100 shadow-sm hover:shadow-md transition text-left min-w-[160px] group"
            >
              <span className="text-xs text-slate-400 font-mono">
                {tx.date.slice(5)}
              </span>
              <span className="text-sm font-medium text-slate-700 truncate w-full group-hover:text-amber-700 transition-colors">
                {tx.description}
              </span>
              <span
                className={`text-sm font-mono font-semibold ${
                  tx.amount < 0 ? "text-slate-900" : "text-emerald-600"
                }`}
              >
                {formatCurrency(tx.amount)}
              </span>
              <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 mt-1">
                Link to Plan
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Shared Modal Instance */}
      <LinkTransactionModal
        transaction={selectedTx}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        projectedInstances={projectedInstances}
        onLink={handleLink}
        isLinking={isLinking}
      />
    </>
  );
}

// --- Sub-Component: Matches edit-modal.tsx styles exactly ---

function LinkTransactionModal({
  transaction,
  isOpen,
  onClose,
  projectedInstances,
  onLink,
  isLinking,
}: {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  projectedInstances: ForecastItem[];
  onLink: (id: string) => void;
  isLinking: boolean;
}) {
  if (!isOpen || !transaction) return null;

  // Filter instances logic
  const sortedInstances = [...projectedInstances].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const target = new Date(transaction.date).getTime();
    return Math.abs(dateA - target) - Math.abs(dateB - target);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            Link to Plan
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto min-h-0">
          {/* Selected Transaction Summary */}
          <div className="p-4 bg-slate-50 rounded-xl mb-6 border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2">
              Selected Transaction
            </div>
            <div className="font-medium text-slate-900 text-lg leading-tight mb-1">
              {transaction.description}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">{transaction.date}</span>
              <span
                className={`font-mono font-bold ${
                  transaction.amount < 0 ? "text-slate-900" : "text-emerald-600"
                }`}
              >
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">
              Select matching forecast item
            </h3>

            <div className="space-y-2">
              {sortedInstances.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => onLink(inst.id)}
                  disabled={isLinking}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-sm transition group text-left"
                >
                  <div className="min-w-0 pr-4">
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                      {inst.ruleName || "Forecast Item"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {inst.date} <span className="text-slate-300 mx-1">|</span>{" "}
                      {inst.category}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-sm font-semibold text-slate-700">
                      {formatCurrency(inst.amount)}
                    </div>
                    {/* Diff indicator */}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Δ {formatCurrency(inst.amount - transaction.amount)}
                    </div>
                  </div>
                </button>
              ))}

              {sortedInstances.length === 0 && (
                <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <p className="text-sm text-slate-500">
                    No projected items found nearby.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

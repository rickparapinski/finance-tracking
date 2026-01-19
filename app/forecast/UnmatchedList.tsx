"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils"; // Ensure this matches your utils path
import { linkTransactionToForecast } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Filter instances to show relevant ones (e.g. same category or close amount?)
  // For now, just sort by date proximity to the transaction
  const sortedInstances = selectedTx
    ? [...projectedInstances].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        const target = new Date(selectedTx.date).getTime();
        return Math.abs(dateA - target) - Math.abs(dateB - target);
      })
    : [];

  const handleLink = async (instanceId: string) => {
    if (!selectedTx) return;
    setIsLinking(true);
    try {
      await linkTransactionToForecast(selectedTx.id, instanceId);
      setIsOpen(false);
      setSelectedTx(null);
    } catch (e) {
      console.error(e);
      alert("Failed to link");
    } finally {
      setIsLinking(false);
    }
  };

  if (transactions.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 animate-in slide-in-from-top-4">
      <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
        Unmatched Transactions ({transactions.length})
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-200">
        {transactions.map((tx) => (
          <Dialog
            key={tx.id}
            open={isOpen && selectedTx?.id === tx.id}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (open) setSelectedTx(tx);
            }}
          >
            <DialogTrigger asChild>
              <button className="flex-shrink-0 flex flex-col items-start gap-1 p-3 rounded-lg bg-white border border-amber-100 shadow-sm hover:shadow-md transition text-left min-w-[160px]">
                <span className="text-xs text-slate-400 font-mono">
                  {tx.date.slice(5)}
                </span>
                <span className="text-sm font-medium text-slate-700 truncate w-full">
                  {tx.description}
                </span>
                <span
                  className={`text-sm font-mono font-semibold ${tx.amount < 0 ? "text-slate-900" : "text-emerald-600"}`}
                >
                  {formatCurrency(tx.amount)}
                </span>
                <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 mt-1">
                  Link to Plan
                </span>
              </button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Link to Forecast Plan</DialogTitle>
              </DialogHeader>

              <div className="p-4 bg-slate-50 rounded-lg mb-4 border border-slate-100">
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">
                  Transaction
                </div>
                <div className="font-medium text-slate-900">
                  {tx.description}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-slate-600">{tx.date}</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <p className="text-xs font-medium text-slate-500 px-1">
                  Select a matching planned item:
                </p>
                {sortedInstances.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => handleLink(inst.id)}
                    disabled={isLinking}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition group text-left"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700">
                        {inst.ruleName || "Forecast Item"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {inst.date} • {inst.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-slate-700">
                        {formatCurrency(inst.amount)}
                      </div>
                      {/* Show diff if helpful */}
                      <div className="text-[10px] text-slate-400">
                        Diff: {formatCurrency(inst.amount - tx.amount)}
                      </div>
                    </div>
                  </button>
                ))}
                {sortedInstances.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No projected items found nearby.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}

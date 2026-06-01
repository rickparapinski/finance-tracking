"use client";

import { useState, useMemo } from "react";
import { Search, Link as LinkIcon, Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
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
  const [isLinking, setIsLinking]   = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage]             = useState(0);
  const perPage = 4;

  const handleLink = async (instanceId: string) => {
    if (!selectedTx) return;
    setIsLinking(true);
    try {
      await linkTransactionToForecast(selectedTx.id, instanceId);
      setSelectedTx(null);
      setSearchTerm("");
    } catch {
      alert("Failed to link");
    } finally {
      setIsLinking(false);
    }
  };

  const groupedInstances = useMemo(() => {
    if (!selectedTx) return {};
    const lower = searchTerm.toLowerCase();
    const sorted = [...projectedInstances].sort((a, b) => {
      const txTime = new Date(selectedTx.date).getTime();
      return (
        Math.abs(txTime - new Date(a.date).getTime()) -
        Math.abs(txTime - new Date(b.date).getTime())
      );
    });
    const filtered = sorted.filter((item) => {
      if (!lower) return true;
      return (
        item.ruleName?.toLowerCase().includes(lower) ||
        item.category?.toLowerCase().includes(lower)
      );
    });
    const groups: Record<string, ForecastItem[]> = {};
    filtered.forEach((item) => {
      const k = item.date.substring(0, 7);
      if (!groups[k]) groups[k] = [];
      groups[k].push(item);
    });
    return groups;
  }, [projectedInstances, selectedTx, searchTerm]);

  const sortedGroupKeys = Object.keys(groupedInstances).sort();
  const totalPages = Math.ceil(transactions.length / perPage);
  const visible = transactions.slice(page * perPage, page * perPage + perPage);

  if (transactions.length === 0) return null;

  return (
    <>
      <div className="pixel-box bg-surface overflow-hidden">
        {/* Header */}
        <div className="bg-cream/80 border-b-2 border-ink px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-3.5 w-3.5 text-ink-soft" />
            <span className="font-pixel text-[11px] text-ink-soft uppercase tracking-widest">
              unlinked transactions
            </span>
            <span className="font-mono text-[10px] bg-cream border border-ink/20 px-1.5 text-ink-soft">
              {transactions.length}
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="size-6 flex items-center justify-center border-2 border-ink/20 text-ink-soft
                           hover:border-ink hover:text-ink transition-none disabled:opacity-30"
              >
                <ChevronLeft size={12} />
              </button>
              <span className="font-mono text-[10px] text-ink-soft tabular-nums px-1">
                {page + 1}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="size-6 flex items-center justify-center border-2 border-ink/20 text-ink-soft
                           hover:border-ink hover:text-ink transition-none disabled:opacity-30"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Transaction cards */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visible.map((tx) => (
            <div
              key={tx.id}
              className="border-2 border-ink/15 bg-cream/50 p-3 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="font-mono text-[10px] text-ink-soft bg-cream border border-ink/15 px-1.5 py-px">
                    {format(new Date(tx.date), "dd MMM")}
                  </span>
                  <span className="font-mono font-bold text-xs text-ink">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
                <div className="font-sans text-xs text-ink font-medium line-clamp-2 leading-snug">
                  {tx.description}
                </div>
                <div className="font-mono text-[10px] text-ink-soft mt-1 truncate">
                  {tx.category || "Uncategorized"}
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(tx)}
                className="pixel-box bg-surface h-7 font-mono text-[10px] text-ink
                           hover:bg-lime/20 transition-none
                           active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
              >
                link to forecast
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Link dialog */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="pixel-box bg-surface w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden animate-slide-up">
            {/* Dialog header */}
            <div className="bg-ink px-5 py-3.5 flex items-center justify-between shrink-0">
              <div>
                <div className="font-pixel text-sm text-cream-soft">link to forecast</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-sans text-[10px] text-cream-soft/60 truncate max-w-[180px]">
                    {selectedTx.description}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-cream-soft/80 shrink-0">
                    {formatCurrency(selectedTx.amount)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedTx(null); setSearchTerm(""); }}
                className="size-6 flex items-center justify-center text-cream-soft/60 hover:text-cream-soft transition-none ml-2 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-ink/10 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-ink/30 pointer-events-none" />
                <input
                  autoFocus
                  placeholder="search forecasts…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 w-full border-2 border-ink/20 bg-cream-soft pl-8 pr-3 font-mono text-xs text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink transition-none"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {sortedGroupKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-ink/25 space-y-2">
                  <Calendar className="h-7 w-7" />
                  <span className="font-mono text-xs">no matches.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedGroupKeys.map((monthKey) => {
                    const items = groupedInstances[monthKey];
                    const [y, m] = monthKey.split("-");
                    const label = format(new Date(parseInt(y), parseInt(m) - 1), "MMMM yyyy");
                    return (
                      <div key={monthKey}>
                        <div className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest mb-2">
                          {label}
                        </div>
                        <div className="pixel-box bg-surface overflow-hidden divide-y divide-ink/10">
                          {items.map((inst) => (
                            <button
                              key={inst.id}
                              disabled={isLinking}
                              onClick={() => handleLink(inst.id)}
                              className="w-full flex items-center justify-between px-4 py-3
                                         hover:bg-lime/10 transition-none text-left disabled:opacity-40"
                            >
                              <div className="min-w-0">
                                <div className="font-sans text-xs text-ink font-medium truncate">
                                  {inst.ruleName}
                                </div>
                                <div className="font-mono text-[10px] text-ink-soft mt-px">
                                  {inst.category || "Uncategorized"}
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold text-ink shrink-0 ml-3">
                                {formatCurrency(inst.amount)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

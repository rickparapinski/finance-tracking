"use client";

import { useState, useMemo } from "react";
import { Search, Link as LinkIcon, Calendar, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  const [isLinking, setIsLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 3;

  const handleLink = async (instanceId: string) => {
    if (!selectedTx) return;
    setIsLinking(true);
    try {
      await linkTransactionToForecast(selectedTx.id, instanceId);
      setSelectedTx(null);
      setSearchTerm("");
    } catch (e) {
      console.error(e);
      alert("Failed to link");
    } finally {
      setIsLinking(false);
    }
  };

  const groupedInstances = useMemo(() => {
    if (!selectedTx) return {};
    const lowerSearch = searchTerm.toLowerCase();
    const sorted = [...projectedInstances].sort((a, b) => {
      const txDate = new Date(selectedTx.date).getTime();
      return Math.abs(txDate - new Date(a.date).getTime()) - Math.abs(txDate - new Date(b.date).getTime());
    });
    const filtered = sorted.filter((item) => {
      if (!lowerSearch) return true;
      return item.ruleName?.toLowerCase().includes(lowerSearch) || item.category?.toLowerCase().includes(lowerSearch);
    });
    const groups: Record<string, ForecastItem[]> = {};
    filtered.forEach((item) => {
      const key = item.date.substring(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [projectedInstances, selectedTx, searchTerm]);

  const sortedGroupKeys = Object.keys(groupedInstances).sort();

  if (transactions.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-emerald-100 bg-emerald-50/50 px-5 py-4 flex items-center gap-3 text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">All transactions are linked!</span>
      </div>
    );
  }

  const totalPages = Math.ceil(transactions.length / perPage);
  const visible = transactions.slice(page * perPage, page * perPage + perPage);

  return (
    <>
      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] p-5">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <LinkIcon size={13} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              Unlinked Transactions
              <span className="ml-2 text-xs font-normal text-slate-400">({transactions.length})</span>
            </h3>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-400 tabular-nums">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Transaction cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-[11px] font-mono text-slate-500 bg-white border border-slate-100 px-1.5 py-0.5 rounded-md">
                    {format(new Date(tx.date), "dd MMM")}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug">
                  {tx.description}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{tx.category || "Uncategorized"}</div>
              </div>
              <button
                onClick={() => setSelectedTx(tx)}
                className="h-8 rounded-lg bg-white border border-amber-200 text-xs font-medium text-amber-700 hover:bg-amber-50 transition"
              >
                Link to forecast
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Link dialog */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Dialog header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Link to Forecast</h3>
                <div className="flex items-center justify-between gap-3 mt-0.5">
                  <span className="text-xs text-slate-500 truncate max-w-[220px]">{selectedTx.description}</span>
                  <span className="text-xs font-mono font-bold text-slate-700 shrink-0">{formatCurrency(selectedTx.amount)}</span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedTx(null); setSearchTerm(""); }}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition ml-2 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  placeholder="Search forecasts…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-5">
              {sortedGroupKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <Calendar className="h-8 w-8 opacity-20" />
                  <span className="text-xs">No matching forecasts found.</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {sortedGroupKeys.map((monthKey) => {
                    const items = groupedInstances[monthKey];
                    const [y, m] = monthKey.split("-");
                    const label = format(new Date(parseInt(y), parseInt(m) - 1), "MMMM yyyy");
                    return (
                      <div key={monthKey}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                        <div className="space-y-1.5">
                          {items.map((inst) => (
                            <button
                              key={inst.id}
                              disabled={isLinking}
                              onClick={() => handleLink(inst.id)}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/40 transition text-left disabled:opacity-50"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-800 truncate">{inst.ruleName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{inst.category || "Uncategorized"}</div>
                              </div>
                              <span className="font-mono text-sm font-semibold text-slate-700 shrink-0 ml-3">
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

"use client";

import { useState, useMemo } from "react";
import { Search, Link as LinkIcon, Calendar } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/finance-utils";
import { linkTransactionToForecast } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  const handleLink = async (instanceId: string) => {
    if (!selectedTx) return;
    setIsLinking(true);
    try {
      await linkTransactionToForecast(selectedTx.id, instanceId);
      setSelectedTx(null); // Close modal on success
      setSearchTerm(""); // Reset search
    } catch (e) {
      console.error(e);
      alert("Failed to link");
    } finally {
      setIsLinking(false);
    }
  };

  // --- Grouping & Filtering Logic ---
  const groupedInstances = useMemo(() => {
    if (!selectedTx) return {};

    // 1. Filter by Search
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = projectedInstances.filter((item) => {
      if (!lowerSearch) return true;
      return (
        item.ruleName?.toLowerCase().includes(lowerSearch) ||
        item.category?.toLowerCase().includes(lowerSearch)
      );
    });

    // 2. Group by Month (Key: "2026-01")
    const groups: Record<string, ForecastItem[]> = {};
    filtered.forEach((item) => {
      // Use just YYYY-MM for sorting/grouping key
      const monthKey = item.date.substring(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });

    // 3. Sort items within groups? (Optional, maybe by amount or name)
    // Currently staying with default order (usually date/creation)

    return groups;
  }, [projectedInstances, selectedTx, searchTerm]);

  // Sort group keys chronologicaly
  const sortedGroupKeys = Object.keys(groupedInstances).sort();

  if (transactions.length === 0) return null;

  return (
    <>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <LinkIcon size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">
              Unmatched Transactions
            </h3>
            <p className="text-sm text-amber-700/80">
              {transactions.length} items need to be linked to a budget.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="group flex flex-col justify-between p-3 rounded-xl border border-amber-200/60 bg-white hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <div className="mb-2">
                <div className="flex justify-between items-start gap-2">
                  <div
                    className="font-medium text-slate-900 line-clamp-1 text-sm"
                    title={tx.description}
                  >
                    {tx.description}
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                    {format(new Date(tx.date), "dd MMM")}
                  </span>
                  <span className="truncate max-w-[120px]">{tx.category}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                onClick={() => setSelectedTx(tx)}
              >
                Link to Budget
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* --- LINKING DIALOG --- */}
      <Dialog
        open={!!selectedTx}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTx(null);
            setSearchTerm("");
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900 flex flex-col gap-1">
              <span>Link Transaction</span>
              {selectedTx && (
                <div className="flex items-center justify-between text-sm font-normal text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                  <span className="truncate mr-2">
                    {selectedTx.description}
                  </span>
                  <span className="font-mono font-bold text-slate-700 whitespace-nowrap">
                    {formatCurrency(selectedTx.amount)}
                  </span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Search Bar */}
          <div className="p-4 pb-2 pt-2 bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search budgets (e.g. Groceries)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-amber-500"
              />
            </div>
          </div>

          {/* Grouped List */}
          <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-6">
            {sortedGroupKeys.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No matching budgets found.
              </div>
            ) : (
              sortedGroupKeys.map((monthKey) => {
                const groupItems = groupedInstances[monthKey];
                // Format Header: "2026-01" -> "January 2026"
                const [y, m] = monthKey.split("-");
                const dateObj = new Date(parseInt(y), parseInt(m) - 1);
                const label = format(dateObj, "MMMM yyyy");

                return (
                  <div key={monthKey} className="space-y-2">
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 border-b border-slate-100 flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        {label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {groupItems.map((inst) => (
                        <button
                          key={inst.id}
                          disabled={isLinking}
                          onClick={() => handleLink(inst.id)}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-amber-400 hover:bg-amber-50/30 transition-all group text-left shadow-sm"
                        >
                          <div className="min-w-0 pr-4">
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-amber-800 truncate">
                              {inst.ruleName || "Forecast Item"}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <span>
                                {format(new Date(inst.date), "dd MMM")}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span>{inst.category || "Uncategorized"}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-mono text-sm font-bold text-slate-700">
                              {formatCurrency(inst.amount)}
                            </div>
                            {selectedTx && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Left:{" "}
                                {formatCurrency(
                                  inst.amount - selectedTx.amount,
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

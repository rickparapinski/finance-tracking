"use client";

import { useState, useMemo } from "react";
import { Search, Link as LinkIcon, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/finance-utils";
import { linkTransactionToForecast } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
      setSelectedTx(null);
      setSearchTerm("");
    } catch (e) {
      console.error(e);
      alert("Failed to link");
    } finally {
      setIsLinking(false);
    }
  };

  // Grouping Logic (Same as before)
  const groupedInstances = useMemo(() => {
    if (!selectedTx) return {};
    const lowerSearch = searchTerm.toLowerCase();

    // Sort by Date (Closest to transaction date first)
    const sortedProjected = [...projectedInstances].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const txDate = new Date(selectedTx.date).getTime();
      return Math.abs(txDate - dateA) - Math.abs(txDate - dateB);
    });

    const filtered = sortedProjected.filter((item) => {
      if (!lowerSearch) return true;
      return (
        item.ruleName?.toLowerCase().includes(lowerSearch) ||
        item.category?.toLowerCase().includes(lowerSearch)
      );
    });

    const groups: Record<string, ForecastItem[]> = {};
    filtered.forEach((item) => {
      const monthKey = item.date.substring(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });
    return groups;
  }, [projectedInstances, selectedTx, searchTerm]);

  const sortedGroupKeys = Object.keys(groupedInstances).sort();

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center gap-3 text-emerald-800">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">
          All transactions are linked!
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <LinkIcon size={12} />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">
            Link Transactions ({transactions.length})
          </h3>
        </div>

        <Carousel className="w-full">
          <CarouselContent>
            {transactions.map((tx) => (
              <CarouselItem key={tx.id} className="md:basis-1/2 lg:basis-1/2">
                <div className="p-1">
                  <Card className="border-amber-200/60 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="flex flex-col justify-between p-4 h-[160px]">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-mono">
                            {format(new Date(tx.date), "dd MMM")}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                        <div
                          className="font-medium text-slate-900 line-clamp-2 text-sm leading-snug mb-2"
                          title={tx.description}
                        >
                          {tx.description}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {tx.category || "Uncategorized"}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-3 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-none"
                        onClick={() => setSelectedTx(tx)}
                      >
                        Link to Budget
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* --- LINKING DIALOG (Same logic as before, cleaner styling) --- */}
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
          <DialogHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Link to Budget
            </DialogTitle>
            {selectedTx && (
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                <span className="truncate mr-2 font-medium">
                  {selectedTx.description}
                </span>
                <span className="font-mono font-bold text-slate-700">
                  {formatCurrency(selectedTx.amount)}
                </span>
              </div>
            )}
          </DialogHeader>

          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            {sortedGroupKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <Calendar className="h-8 w-8 opacity-20" />
                <span className="text-xs">No matching budgets found.</span>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {sortedGroupKeys.map((monthKey) => {
                  const groupItems = groupedInstances[monthKey];
                  const [y, m] = monthKey.split("-");
                  const dateObj = new Date(parseInt(y), parseInt(m) - 1);
                  const label = format(dateObj, "MMMM yyyy");

                  return (
                    <div key={monthKey} className="space-y-2">
                      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-normal text-slate-500 bg-slate-50"
                        >
                          {label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {groupItems.map((inst) => (
                          <button
                            key={inst.id}
                            disabled={isLinking}
                            onClick={() => handleLink(inst.id)}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all group text-left shadow-sm active:scale-[0.98]"
                          >
                            <div className="min-w-0 pr-4">
                              <div className="text-sm font-medium text-slate-700 group-hover:text-blue-700 truncate">
                                {inst.ruleName}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {inst.category || "Uncategorized"}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono text-sm font-semibold text-slate-700">
                                {formatCurrency(inst.amount)}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Left
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

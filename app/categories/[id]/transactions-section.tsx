"use client";

import { useState, useTransition } from "react";
import { getCategoryTransactions } from "../actions";
import { DataTable } from "@/app/transactions/data-table";
import { columns } from "@/app/transactions/columns";
import { Transaction } from "@/lib/adapters/types";

type Cycle = { key: string; start_date: string; end_date: string };

export function TransactionsSection({
  categoryName,
  initialTransactions,
  cycles,
  currentCycleKey,
  currentStart,
  currentEnd,
  categories,
  accounts,
}: {
  categoryName: string;
  initialTransactions: Transaction[];
  cycles: Cycle[];
  currentCycleKey: string;
  currentStart: string;
  currentEnd: string;
  categories: string[];
  accounts: { id: string; name: string }[];
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedCycle, setSelectedCycle] = useState(currentCycleKey);
  const [isPending, startTransition] = useTransition();

  const handleCycleChange = (key: string) => {
    setSelectedCycle(key);
    const cycle = cycles.find((c) => c.key === key);
    if (!cycle) return;
    startTransition(async () => {
      const data = await getCategoryTransactions(
        categoryName,
        cycle.start_date,
        cycle.end_date,
      );
      setTransactions(data as Transaction[]);
    });
  };

  const otherCycles = cycles.filter((c) => c.key !== currentCycleKey);

  function fmtCycleLabel(start: string, end: string) {
    const f = (s: string) => {
      const [y, m, d] = s.split("-");
      return `${parseInt(m)}/${parseInt(d)}/${y}`;
    };
    return `${f(start)} — ${f(end)}`;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Transactions</h2>
          <p className="text-xs text-slate-500">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} in this cycle
          </p>
        </div>
        <select
          value={selectedCycle}
          onChange={(e) => handleCycleChange(e.target.value)}
          disabled={isPending}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
        >
          <option value={currentCycleKey}>
            {fmtCycleLabel(currentStart, currentEnd)} (current)
          </option>
          {otherCycles.map((c) => (
            <option key={c.key} value={c.key}>
              {fmtCycleLabel(c.start_date, c.end_date)}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        categories={categories}
        accounts={accounts}
        uncategorizedCount={0}
      />
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { getCategoryTransactions } from "../actions";
import { DataTable } from "@/app/transactions/data-table";
import { columns } from "@/app/transactions/columns";
import { CycleNavigator } from "@/components/cycle-navigator";
import { type Period } from "@/lib/periods";
import { Transaction } from "@/lib/adapters/types";

export function TransactionsSection({
  categoryName,
  initialTransactions,
  periods,
  currentCycleKey,
  categories,
  accounts,
}: {
  categoryName: string;
  initialTransactions: Transaction[];
  periods: Period[];
  currentCycleKey: string;
  categories: string[];
  accounts: { id: string; name: string }[];
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedKey, setSelectedKey] = useState(currentCycleKey);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (period: Period) => {
    setSelectedKey(period.key);
    startTransition(async () => {
      const data = await getCategoryTransactions(
        categoryName,
        period.start_date,
        period.end_date,
      );
      setTransactions(data as unknown as Transaction[]);
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-mono text-xs text-ink-soft">transactions</span>
          <span className="font-mono text-xs text-ink-soft ml-2">
            — {transactions.length} in this period
          </span>
        </div>
        <CycleNavigator
          periods={periods}
          currentKey={currentCycleKey}
          selectedKey={selectedKey}
          isPending={isPending}
          onChange={handlePeriodChange}
        />
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        categories={categories}
        accounts={accounts}
        uncategorizedCount={0}
        compact
      />
    </section>
  );
}

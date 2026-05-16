"use client";

import { useState, useTransition } from "react";
import { DataTable } from "@/app/transactions/data-table";
import { columnsForAccount } from "./transactions-columns";
import { getAccountTransactions } from "./actions";
import { QuickAddForm } from "@/components/quick-add-form";
import { CycleNavigator } from "@/components/cycle-navigator";
import { type Period } from "@/lib/periods";
import { Transaction } from "@/lib/adapters/types";

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
  const [selectedKey, setSelectedKey] = useState(currentCycleKey);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (period: Period) => {
    setSelectedKey(period.key);
    startTransition(async () => {
      const data = await getAccountTransactions(
        accountId,
        period.start_date,
        period.end_date
      );
      setTransactions(data as Transaction[]);
    });
  };

  const refresh = async () => {
    const period = periods.find((p) => p.key === selectedKey) ?? periods[0];
    const data = await getAccountTransactions(
      accountId,
      period.start_date,
      period.end_date
    );
    setTransactions(data as Transaction[]);
  };

  return (
    <div className="space-y-6">
      <QuickAddForm
        accounts={accounts}
        categories={categories}
        defaultAccountId={accountId}
        onSuccess={refresh}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Transactions</h2>
            <p className="text-xs text-slate-500">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} in this period
            </p>
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
          columns={columnsForAccount}
          data={transactions}
          categories={categories}
          accounts={accounts}
          uncategorizedCount={uncategorizedCount}
        />
      </section>
    </div>
  );
}

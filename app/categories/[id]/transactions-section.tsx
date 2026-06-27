"use client";

import { DataTable } from "@/app/transactions/data-table";
import { columns } from "@/app/transactions/columns";
import { Transaction } from "@/lib/adapters/types";

export function TransactionsSection({
  initialTransactions,
  cycleFrom,
  cycleTo,
  prevCycleFrom,
  prevCycleTo,
  categories,
  accounts,
}: {
  categoryName: string;
  initialTransactions: Transaction[];
  cycleFrom: string;
  cycleTo: string;
  prevCycleFrom: string;
  prevCycleTo: string;
  categories: string[];
  accounts: { id: string; name: string }[];
}) {
  return (
    <section className="space-y-3">
      <DataTable
        columns={columns}
        data={initialTransactions}
        categories={categories}
        accounts={accounts}
        uncategorizedCount={0}
        compact
        cycleFrom={cycleFrom}
        cycleTo={cycleTo}
        prevCycleFrom={prevCycleFrom}
        prevCycleTo={prevCycleTo}
        initialPreset="all"
      />
    </section>
  );
}

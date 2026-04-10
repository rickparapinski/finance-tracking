"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Transaction } from "@/lib/adapters/types";
import { deleteTransaction } from "./actions";

// Define the custom meta type so TypeScript doesn't complain
declare module "@tanstack/react-table" {
  interface TableMeta<TData extends unknown> {
    openEditModal: (transaction: TData) => void;
  }
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    // whitespace-nowrap ensures the column is only as wide as the date
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-zinc-500">
        {row.original.date.split("T")[0]}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const { installment_index: idx, installment_total: total } = row.original;
      return (
        <div className="min-w-[220px] flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">
            {row.original.description}
          </span>
          {idx != null && total != null && (
            <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 tabular-nums">
              {idx}/{total}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="whitespace-nowrap bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-xs text-zinc-600 dark:text-zinc-300">
        {row.original.category || "Uncategorized"}
      </span>
    ),
  },
  {
    accessorKey: "accounts.name",
    header: "Account",
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-xs text-zinc-500">
        {row.original.accounts?.name}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = row.original.amount;
      const amountEur = row.original.amount_eur;
      const currency = row.original.original_currency;
      const isNonEur = currency && currency !== "EUR";

      const fmt = (n: number, cur: string) =>
        new Intl.NumberFormat("de-DE", { style: "currency", currency: cur }).format(n);

      return (
        <div className="text-right whitespace-nowrap font-mono">
          <span
            className={[
              "font-semibold tabular-nums",
              amount > 0 && "text-emerald-600",
              amount < 0 && "text-slate-700",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {fmt(amount, currency || "EUR")}
          </span>
          {isNonEur && amountEur != null && (
            <div className="text-[10px] text-slate-400 tabular-nums">{fmt(amountEur, "EUR")}</div>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      return (
        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => table.options.meta?.openEditModal(row.original)}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            Edit
          </button>
          <form action={deleteTransaction.bind(null, row.original.id)}>
            <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
              Del
            </button>
          </form>
        </div>
      );
    },
  },
];

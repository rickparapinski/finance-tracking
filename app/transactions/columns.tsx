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
    // w-full on a div inside allows the table cell to expand
    cell: ({ row }) => (
      <div className="min-w-[220px] text-sm font-medium text-slate-800">
        {row.original.description}
      </div>
    ),
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
      const currency = row.original.original_currency;

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
            {new Intl.NumberFormat("de-DE", {
              style: "currency",
              currency,
            }).format(amount)}
          </span>
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

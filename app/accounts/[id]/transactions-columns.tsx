"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Transaction } from "@/lib/adapters/types";
import { deleteTransaction } from "@/app/transactions/actions";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends unknown> {
    openEditModal: (transaction: TData) => void;
  }
}

export const columnsForAccount: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-zinc-500">{(row.original as any).date}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
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
      <span className="whitespace-nowrap bg-zinc-100 px-2 py-1 rounded-full text-xs text-zinc-600">
        {row.original.category || "Uncategorized"}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = Number((row.original as any).amount);
      const currency = (row.original as any).original_currency || "EUR";

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
    cell: ({ row, table }) => (
      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => table.options.meta?.openEditModal(row.original)}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          Edit
        </button>
        <form action={deleteTransaction.bind(null, (row.original as any).id)}>
          <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
            Del
          </button>
        </form>
      </div>
    ),
  },
];

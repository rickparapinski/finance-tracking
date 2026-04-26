"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Transaction } from "@/lib/adapters/types";
import { deleteTransaction } from "@/app/transactions/actions";
import { categoryColor } from "@/lib/category-color";

function fmtDate(raw: string) {
  const d = new Date(raw.split("T")[0] + "T00:00:00");
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    mon: d.toLocaleDateString("en-GB", { month: "short" }),
  };
}

export const columnsForAccount: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const { day, mon } = fmtDate((row.original as any).date);
      return (
        <div className="text-center w-10 shrink-0">
          <div className="text-sm font-semibold text-slate-800 leading-tight">{day}</div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wide">{mon}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const { installment_index: idx, installment_total: total } = row.original as any;
      return (
        <div className="min-w-[180px]">
          <span className="text-sm font-medium text-slate-800">{row.original.description}</span>
          {idx != null && total != null && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 tabular-nums">
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
    cell: ({ row }) => {
      const cat = row.original.category || "Uncategorized";
      const color = cat === "Uncategorized" ? "#94a3b8" : categoryColor(cat);
      return (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs text-slate-600">{cat}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = Number((row.original as any).amount);
      const amountEur = (row.original as any).amount_eur;
      const currency = (row.original as any).original_currency || "EUR";
      const isNonEur = currency !== "EUR";
      const fmt = (n: number, cur: string) =>
        new Intl.NumberFormat("de-DE", { style: "currency", currency: cur }).format(n);
      return (
        <div className="text-right">
          <span className={`font-semibold tabular-nums font-mono text-sm ${amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {fmt(amount, currency)}
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
    cell: ({ row, table }) => (
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => table.options.meta?.openEditModal(row.original)}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          Edit
        </button>
        <form action={deleteTransaction.bind(null, (row.original as any).id)}>
          <button className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
            Del
          </button>
        </form>
      </div>
    ),
  },
];

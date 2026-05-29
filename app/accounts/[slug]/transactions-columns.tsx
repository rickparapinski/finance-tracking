"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Transaction } from "@/lib/adapters/types";
import { deleteTransaction } from "@/app/transactions/actions";
import { categoryColor } from "@/lib/category-color";

function fmtDate(raw: string) {
  const d = new Date(raw.split("T")[0] + "T00:00:00");
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    mon: d.toLocaleDateString("en-GB", { month: "short" }).toLowerCase(),
  };
}

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
  }).format(n);

export const columnsForAccount: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const { day, mon } = fmtDate((row.original as any).date);
      return (
        <div className="text-center w-10 shrink-0">
          <div className="font-mono text-sm text-ink leading-tight">{day}</div>
          <div className="font-mono text-[10px] text-ink-soft uppercase tracking-wide">{mon}</div>
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
          <span className="font-sans text-sm text-ink">{row.original.description}</span>
          {idx != null && total != null && (
            <span className="ml-2 border border-ink/20 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-ink-soft tabular-nums">
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
          <span className="font-sans text-xs text-ink-soft">{cat}</span>
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
      const isPositive = amount > 0;
      const eurVal = amountEur != null ? Number(amountEur) : Number(amount);
      const isBig = !isNaN(eurVal) && Math.abs(eurVal) > 100;
      return (
        <div className="text-right">
          <span className={`tabular-nums font-mono text-sm ${isBig ? "font-bold" : "font-medium"} ${isPositive ? "text-lime" : "text-ink"}`}>
            <span className="text-[10px] mr-0.5 opacity-60">{isPositive ? "↑" : "↓"}</span>
            {fmt(amount, currency)}
          </span>
          {isNonEur && amountEur != null && (
            <div className="font-mono text-[10px] text-ink/35 tabular-nums">
              {fmt(Number(amountEur), "EUR")}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => (
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-none">
        <button
          onClick={() => table.options.meta?.openEditModal(row.original)}
          className="rounded-md px-2.5 py-1 font-mono text-xs text-ink-soft hover:bg-cream-soft hover:text-ink transition-none"
        >
          edit
        </button>
        <form action={deleteTransaction.bind(null, (row.original as any).id)}>
          <button className="rounded-md px-2.5 py-1 font-mono text-xs text-ink-soft hover:bg-ink hover:text-cream-soft transition-none">
            del
          </button>
        </form>
      </div>
    ),
  },
];

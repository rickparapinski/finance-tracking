"use client";

import { useState, useRef } from "react";
import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Transaction } from "@/lib/adapters/types";
import { deleteTransaction } from "./actions";
import { categoryColor } from "@/lib/category-color";
import { Tag, X } from "lucide-react";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends unknown> {
    openEditModal: (transaction: TData) => void;
    setTag: (id: string, tag: string | null) => Promise<void>;
    allTags: string[];
  }
}

function fmtDate(raw: string) {
  const d = new Date(raw.split("T")[0] + "T00:00:00");
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    mon: d.toLocaleDateString("en-GB", { month: "short" }),
    year: d.getFullYear(),
  };
}

function TagCell({ row, table }: { row: Row<Transaction>; table: Table<Transaction> }) {
  const tag = (row.original as any).tag as string | null;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(tag ?? "");

  const save = async () => {
    const trimmed = val.trim() || null;
    if (trimmed !== tag) await table.options.meta?.setTag(String(row.original.id), trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <>
        <datalist id="tx-tags-list">
          {(table.options.meta?.allTags ?? []).map((t) => <option key={t} value={t} />)}
        </datalist>
        <input
          autoFocus
          list="tx-tags-list"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="Add tag…"
          className="h-6 w-28 rounded-md border border-indigo-300 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </>
    );
  }

  if (tag) {
    return (
      <span
        onClick={() => { setVal(tag); setEditing(true); }}
        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 cursor-pointer hover:bg-indigo-100 transition group"
      >
        <Tag className="w-2.5 h-2.5 shrink-0" />
        {tag}
        <button
          onClick={async (e) => { e.stopPropagation(); await table.options.meta?.setTag(String(row.original.id), null); }}
          className="ml-0.5 opacity-0 group-hover:opacity-100 transition text-indigo-400 hover:text-rose-500"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => { setVal(""); setEditing(true); }}
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-2 py-0.5 text-[11px] text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition opacity-0 group-hover:opacity-100"
    >
      <Tag className="w-2.5 h-2.5" /> tag
    </button>
  );
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const { day, mon } = fmtDate(row.original.date);
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
    accessorKey: "accounts.name",
    header: "Account",
    cell: ({ row }) => (
      <span className="text-xs text-slate-400 whitespace-nowrap">{(row.original as any).accounts?.name}</span>
    ),
  },
  {
    id: "tag",
    header: "",
    cell: ({ row, table }) => <TagCell row={row} table={table} />,
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = row.original.amount;
      const amountEur = (row.original as any).amount_eur;
      const currency = (row.original as any).original_currency || "EUR";
      const isNonEur = currency && currency !== "EUR";
      const fmt = (n: number, cur: string) =>
        new Intl.NumberFormat("de-DE", { style: "currency", currency: cur }).format(n);
      return (
        <div className="text-right">
          <span className={`font-semibold tabular-nums font-mono text-sm ${amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
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
    cell: ({ row, table }) => (
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => table.options.meta?.openEditModal(row.original)}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          Edit
        </button>
        <form action={deleteTransaction.bind(null, row.original.id)}>
          <button className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
            Del
          </button>
        </form>
      </div>
    ),
  },
];

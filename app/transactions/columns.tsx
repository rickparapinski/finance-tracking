"use client";

import { useState } from "react";
import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Transaction } from "@/lib/adapters/types";
import { deleteTransaction } from "./actions";
import { CategoryBadge } from "@/components/ui/category-badge";
import { X } from "lucide-react";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends unknown> {
    openEditModal: (transaction: TData) => void;
    setTag: (id: string, tag: string | null) => Promise<void>;
    allTags: string[];
  }
}

// ── Formatters ─────────────────────────────────────────────────────────────

function fmtDate(raw: string) {
  const d = new Date(raw.split("T")[0] + "T00:00:00");
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    mon: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
  };
}

function fmtEur(n: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

/** Split "Wolt * Lunch" → { merchant: "Wolt", detail: "Lunch" } */
function splitDescription(raw: string): { merchant: string; detail: string | null } {
  const idx = raw.indexOf(" * ");
  if (idx === -1) return { merchant: raw, detail: null };
  return { merchant: raw.slice(0, idx), detail: raw.slice(idx + 3) };
}

// ── Tag cell ───────────────────────────────────────────────────────────────

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
          {(table.options.meta?.allTags ?? []).map((t) => (
            <option key={t} value={t} />
          ))}
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
          placeholder="add tag…"
          className="h-6 w-24 rounded-md border-2 border-ink/30 bg-white px-2 font-mono text-[10px] text-ink focus:outline-none focus:border-ink/60"
        />
      </>
    );
  }

  if (tag) {
    return (
      <span
        onClick={() => { setVal(tag); setEditing(true); }}
        className="inline-flex items-center gap-1 border-2 border-ink/25 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-ink/50 cursor-pointer hover:border-ink/50 hover:text-ink/70 transition-none group"
      >
        {tag}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await table.options.meta?.setTag(String(row.original.id), null);
          }}
          className="ml-0.5 opacity-0 group-hover:opacity-100 transition-none text-ink/30 hover:text-ink"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => { setVal(""); setEditing(true); }}
      className="inline-flex items-center border-2 border-ink/25 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-ink/35 hover:border-ink/50 hover:text-ink/55 transition-none opacity-0 group-hover:opacity-100"
    >
      + tag
    </button>
  );
}

// ── Column definitions ─────────────────────────────────────────────────────

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "date",
    cell: ({ row }) => {
      const { day, mon } = fmtDate(row.original.date);
      return (
        // Hierarchy: large pixel day number, tiny mono month below
        <div className="text-center w-9 shrink-0">
          <div className="font-pixel text-[17px] text-ink leading-none">{day}</div>
          <div className="font-mono text-[9px] text-ink/40 uppercase tracking-widest mt-0.5">{mon}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "description",
    cell: ({ row }) => {
      const { installment_index: idx, installment_total: total } = row.original as any;
      const { merchant, detail } = splitDescription(row.original.description ?? "");
      return (
        <div className="min-w-[180px] flex items-baseline gap-1 flex-wrap">
          <span className="font-sans text-[13px] text-ink/80">{merchant}</span>
          {detail && (
            <>
              <span className="font-sans text-[13px] text-ink/25">·</span>
              <span className="font-sans text-[12px] text-ink/45">{detail}</span>
            </>
          )}
          {idx != null && total != null && (
            <span className="border-2 border-ink/20 rounded-md px-1 py-0.5 font-mono text-[9px] text-ink/35 tabular-nums">
              {idx}/{total}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "category",
    cell: ({ row }) => {
      const cat = row.original.category || "Uncategorized";
      return <CategoryBadge name={cat} />;
    },
  },
  {
    accessorKey: "accounts.name",
    header: "account",
    cell: ({ row }) => (
      <span className="font-sans text-[11px] text-ink/35 whitespace-nowrap">
        {(row.original as any).accounts?.name}
      </span>
    ),
  },
  {
    id: "tag",
    header: "",
    cell: ({ row, table }) => <TagCell row={row} table={table} />,
  },
  {
    accessorKey: "amount",
    header: "amount",
    cell: ({ row }) => {
      const amount = row.original.amount;
      const amountEur = (row.original as any).amount_eur;
      const currency = (row.original as any).original_currency || "EUR";
      const isNonEur = currency && currency !== "EUR";
      const isPositive = amount > 0;
      // Bold when >100€ absolute value
      const isBig = Math.abs(amountEur ?? amount) > 100;

      return (
        <div className="text-right">
          <span
            className={`tabular-nums font-mono text-[13px] ${isBig ? "font-bold" : "font-medium"} ${
              isPositive ? "text-lime" : "text-ink"
            }`}
          >
            <span className="text-[10px] mr-0.5 opacity-60">{isPositive ? "↑" : "↓"}</span>
            {fmtEur(amount, currency)}
          </span>
          {isNonEur && amountEur != null && (
            <div className="font-mono text-[10px] text-ink/35 tabular-nums">
              {fmtEur(amountEur, "EUR")}
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
          className="border-2 border-ink/30 rounded-md px-2 py-0.5 font-mono text-[10px] text-ink/50 hover:border-ink hover:text-ink transition-none"
        >
          edit
        </button>
        <form action={deleteTransaction.bind(null, row.original.id)}>
          <button className="border-2 border-ink/20 rounded-md px-2 py-0.5 font-mono text-[10px] text-ink/35 hover:border-ink/50 hover:text-ink/60 transition-none">
            del
          </button>
        </form>
      </div>
    ),
  },
];

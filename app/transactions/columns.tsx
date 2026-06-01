"use client";

import { useState } from "react";
import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Transaction } from "@/lib/adapters/types";
import { deleteTransaction } from "./actions";
import { CategoryBadge } from "@/components/ui/category-badge";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { DeleteTransactionButton } from "@/components/ui/delete-transaction-button";
import { X } from "lucide-react";

const btnSec =
  "h-7 bg-surface border-2 border-ink text-ink font-mono text-[10px] px-2 " +
  "shadow-[3px_3px_0_#1F1F1F] hover:bg-cream-soft " +
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#1F1F1F] " +
  "disabled:opacity-30 disabled:pointer-events-none transition-none";

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
    mon: d.toLocaleDateString("en-GB", { month: "short" }).toLowerCase(),
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
          className="h-6 w-24 border-2 border-ink/30 bg-white px-2 font-mono text-[10px] text-ink focus:outline-none focus:border-ink/60"
        />
      </>
    );
  }

  if (tag) {
    return (
      <PixelBadge
        onClick={() => { setVal(tag); setEditing(true); }}
        className="gap-1 cursor-pointer hover:text-ink/80 transition-none group/tag"
      >
        {tag}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await table.options.meta?.setTag(String(row.original.id), null);
          }}
          className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-none text-ink/30 hover:text-ink"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </PixelBadge>
    );
  }

  return (
    <PixelBadge
      variant="muted"
      onClick={() => { setVal(""); setEditing(true); }}
      className="cursor-pointer hover:text-ink/55 transition-none opacity-0 group-hover:opacity-100"
    >
      + tag
    </PixelBadge>
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
        // Inline "28 may" — font-mono text-sm, one line
        <span className="font-mono text-sm text-ink whitespace-nowrap">
          {day} <span className="text-ink/45">{mon}</span>
        </span>
      );
    },
  },
  {
    accessorKey: "description",
    header: "description",
    cell: ({ row }) => {
      const { installment_index: idx, installment_total: total } = row.original as any;
      const { merchant, detail } = splitDescription(row.original.description ?? "");
      // Truncate long detail at 40 chars; full text visible on hover via title
      const truncDetail = detail && detail.length > 40 ? detail.slice(0, 40) + "…" : detail;
      return (
        <div className="min-w-[160px] flex items-baseline gap-1 flex-wrap">
          <span className="font-sans font-medium text-sm text-ink">{merchant}</span>
          {truncDetail && (
            <>
              <span className="text-ink/25 text-[12px]">·</span>
              <span
                className="font-sans text-[12px] text-ink/50"
                title={detail ?? ""}
              >
                {truncDetail}
              </span>
            </>
          )}
          {idx != null && total != null && (
            <PixelBadge variant="muted" className="text-[9px] tabular-nums">
              {idx}/{total}
            </PixelBadge>
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
      const amount    = row.original.amount;
      const amountEur = (row.original as any).amount_eur;
      const currency  = (row.original as any).original_currency || "EUR";
      const isNonEur  = currency && currency !== "EUR";
      const isPositive = amount > 0;
      // Use explicit Number() to handle postgres Decimal objects / strings.
      // Fall back to amount only when amount_eur is null/undefined (not 0).
      const eurVal = amountEur != null ? Number(amountEur) : Number(amount);
      const isBig  = !isNaN(eurVal) && Math.abs(eurVal) > 100;

      return (
        <div className="text-right">
          <span
            className={`tabular-nums font-mono text-sm ${isBig ? "font-bold" : "font-medium"} ${
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
          className={btnSec}
        >
          edit
        </button>
        <DeleteTransactionButton action={deleteTransaction.bind(null, row.original.id)} />
      </div>
    ),
  },
];

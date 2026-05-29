"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { AnimateIn } from "@/components/ui/animate-in";
import { Transaction } from "@/lib/adapters/types";
import { EditModal } from "./edit-modal";
import {
  bulkAssignCategory,
  bulkSetTag,
  setTransactionTag,
  createTransactionLink,
} from "./actions";
import { DateRangePicker } from "@/components/date-range-picker";

// ── Shared button tokens ───────────────────────────────────────────────────
// Secondary: visible ink border, white bg, cream-soft hover, disabled state
const btnSec =
  "h-8 bg-surface border-2 border-ink text-ink font-mono text-[11px] rounded-md px-3 hover:bg-cream-soft disabled:bg-cream-soft disabled:text-ink/40 disabled:border-ink/30 disabled:pointer-events-none transition-none";
// Primary: lime PixelBtn
const btnPrimary =
  "h-8 bg-lime border-2 border-ink text-ink font-pixel text-[10px] rounded-md px-3 shadow-[2px_2px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1F1F1F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-none";

interface DataTableProps {
  columns: ColumnDef<Transaction>[];
  data: Transaction[];
  categories: string[];
  accounts: { id: string; name: string }[];
  allTags?: string[];
  uncategorizedCount?: number;
  cycleFrom?: string;
  cycleTo?: string;
  prevCycleFrom?: string;
  prevCycleTo?: string;
  /** When true the table card shrinks to fit its rows instead of filling the viewport */
  compact?: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

// ── Date preset helpers ────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}
function startOfYear() { return `${new Date().getFullYear()}-01-01`; }

type Preset = { label: string; from: () => string; to: () => string };

// ── Component ──────────────────────────────────────────────────────────────

export function DataTable({
  columns,
  data,
  categories,
  accounts,
  allTags = [],
  uncategorizedCount = 0,
  cycleFrom = "",
  cycleTo = "",
  prevCycleFrom = "",
  prevCycleTo = "",
  compact = false,
}: DataTableProps) {
  // Presets inside component — captures cycle props
  const PRESETS: Preset[] = [
    { label: "7d",         from: () => daysAgo(7),    to: today },
    { label: "30d",        from: () => daysAgo(30),   to: today },
    { label: "cycle",      from: () => cycleFrom,     to: () => cycleTo },
    { label: "last cycle", from: () => prevCycleFrom, to: () => prevCycleTo },
    { label: "ytd",        from: startOfYear,         to: today },
    { label: "all",        from: () => "",            to: () => "" },
  ];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false);
  const [dateFrom, setDateFrom] = useState(cycleFrom);
  const [dateTo, setDateTo] = useState(cycleTo);
  const [activePreset, setActivePreset] = useState<string>(cycleFrom ? "cycle" : "all");
  const [bulkTagValue, setBulkTagValue] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isBulkTagLoading, setIsBulkTagLoading] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<
    "transfer" | "settlement" | "statement_payment" | "refund"
  >("transfer");
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Filtering ────────────────────────────────────────────────────────────
  const visibleData = useMemo(() => {
    let d = data;
    if (showOnlyUncategorized)
      d = d.filter(
        (t) => !t.category || t.category.trim() === "" || t.category === "Uncategorized",
      );
    if (dateFrom) d = d.filter((t) => t.date.split("T")[0] >= dateFrom);
    if (dateTo)   d = d.filter((t) => t.date.split("T")[0] <= dateTo);
    return d;
  }, [data, showOnlyUncategorized, dateFrom, dateTo]);

  // ── Checkbox column (bulk mode only) ─────────────────────────────────────
  const selectionColumn = useMemo<ColumnDef<Transaction>>(
    () => ({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="accent-ink w-3.5 h-3.5"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          className="accent-ink w-3.5 h-3.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 28,
    }),
    [],
  );

  const columnsForTable = useMemo(
    () => (bulkMode ? [selectionColumn, ...columns] : columns),
    [bulkMode, selectionColumn, columns],
  );

  const table = useReactTable({
    data: visibleData,
    columns: columnsForTable,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    meta: {
      openEditModal: (t) => { setEditingTransaction(t); setIsModalOpen(true); },
      setTag: async (id, tag) => { await setTransactionTag(id, tag); },
      allTags,
    },
  });

  // ── Subtotals ─────────────────────────────────────────────────────────────
  const subtotals = useMemo(() => {
    const rows = table.getFilteredRowModel().rows;
    let income = 0, expenses = 0;
    for (const row of rows) {
      const amt = Number((row.original as any).amount_eur ?? row.original.amount);
      if (amt > 0) income += amt; else expenses += amt;
    }
    return { income, expenses, net: income + expenses, count: rows.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getFilteredRowModel().rows.length, visibleData, globalFilter]);

  // ── Animated subtotals — re-run whenever filtered values change ───────────
  const animIncome   = useCountUp(subtotals.income,               { duration: 600, delay: 320 });
  const animExpenses = useCountUp(Math.abs(subtotals.expenses),   { duration: 600, delay: 370 });
  const animNet      = useCountUp(Math.abs(subtotals.net),        { duration: 600, delay: 420 });

  const selectedCount = table.getSelectedRowModel().rows.length;
  const colCount = columnsForTable.length;

  const applyPreset = (p: Preset) => {
    setDateFrom(p.from());
    setDateTo(p.to());
    setActivePreset(p.label);
  };

  const toggleBulkMode = () =>
    setBulkMode((v) => { if (v) setRowSelection({}); return !v; });

  // ── Card surface ──────────────────────────────────────────────────────────
  const card = "bg-surface border-2 border-ink rounded-md shadow-[2px_2px_0_rgba(31,31,31,0.09)]";

  return (
    <div className="space-y-3">
      <EditModal
        transaction={editingTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        accounts={accounts}
        allTags={allTags}
      />

      {/* ── Card 1+2 merged: search row + filter tab row ── */}
      <AnimateIn>
      <div className={card}>
        {/* Search row */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-ink/10">
          <input
            placeholder="search transactions…"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 min-w-[180px] flex-1 border-2 border-ink/25 rounded-md bg-cream px-3 font-sans text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink transition-none"
          />
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
              setActivePreset("");
            }}
          />
          <button
            onClick={toggleBulkMode}
            title="Toggle bulk-edit mode (select rows to batch-assign categories / tags)"
            className={bulkMode
              ? "h-8 bg-ink border-2 border-ink text-cream-soft font-mono text-sm rounded-md px-3 transition-none shrink-0"
              : `${btnSec} shrink-0`
            }
          >
            bulk edit
          </button>
        </div>

        {/* Filter tab row — hairline separator from search */}
        <div className="px-4 py-2 flex items-center flex-wrap gap-y-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`font-mono text-xs px-2.5 py-1.5 border-b-2 transition-none ${
                activePreset === p.label
                  ? "border-lime text-ink"
                  : "border-transparent text-ink/40 hover:text-ink/70 hover:border-ink/20"
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="font-mono text-xs text-ink/30 ml-3">
            {table.getRowModel().rows.length} / {visibleData.length}
          </span>
          {uncategorizedCount > 0 && (
            <label className="flex items-center gap-1.5 ml-3 font-sans text-xs text-ink/45 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyUncategorized}
                onChange={(e) => { setShowOnlyUncategorized(e.target.checked); setRowSelection({}); }}
                className="accent-ink w-3 h-3"
              />
              uncategorized ({uncategorizedCount})
            </label>
          )}
        </div>
      </div>
      </AnimateIn>

      {/* ── Bulk ops panel (only when bulk mode + rows selected) ── */}
      {bulkMode && selectedCount > 0 && (
        <div className={`${card} px-4 py-3 flex flex-wrap items-center gap-2`}>
          <span className="font-pixel text-[10px] text-ink/40 shrink-0">{selectedCount} selected:</span>

          {/* Bulk assign category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 border-2 border-ink/30 rounded-md bg-white px-2 font-sans text-[11px] text-ink focus:outline-none focus:border-ink"
          >
            <option value="">assign category…</option>
            {categories.filter((c) => c !== "Uncategorized").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            disabled={isBulkLoading || !selectedCategory}
            onClick={async () => {
              const ids = table.getSelectedRowModel().rows.map((r) => (r.original as any).id as string);
              setIsBulkLoading(true);
              try { await bulkAssignCategory(ids, selectedCategory); setRowSelection({}); }
              finally { setIsBulkLoading(false); }
            }}
            className={btnPrimary}
          >
            {isBulkLoading ? "assigning…" : "assign"}
          </button>

          <div className="h-5 w-px bg-ink/15 mx-1" />

          {/* Bulk tag */}
          <datalist id="bulk-tags-list">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
          <input
            list="bulk-tags-list"
            value={bulkTagValue}
            onChange={(e) => setBulkTagValue(e.target.value)}
            placeholder="tag name…"
            className="h-8 w-28 border-2 border-ink/30 rounded-md bg-white px-2 font-mono text-[11px] placeholder:text-ink/25 focus:outline-none focus:border-ink"
          />
          <button
            disabled={isBulkTagLoading || !bulkTagValue.trim()}
            onClick={async () => {
              const ids = table.getSelectedRowModel().rows.map((r) => (r.original as any).id as string);
              setIsBulkTagLoading(true);
              try { await bulkSetTag(ids, bulkTagValue.trim()); setRowSelection({}); setBulkTagValue(""); }
              finally { setIsBulkTagLoading(false); }
            }}
            className={btnSec}
          >
            {isBulkTagLoading ? "tagging…" : "tag"}
          </button>

          <div className="h-5 w-px bg-ink/15 mx-1" />

          {/* Link two transactions */}
          <select
            value={selectedLinkType}
            onChange={(e) => setSelectedLinkType(e.target.value as any)}
            className="h-8 border-2 border-ink/30 rounded-md bg-white px-2 font-sans text-[11px] text-ink focus:outline-none"
          >
            <option value="transfer">Transfer</option>
            <option value="settlement">Settlement</option>
            <option value="statement_payment">Statement payment</option>
            <option value="refund">Refund</option>
          </select>
          <button
            disabled={isLinkLoading || selectedCount !== 2}
            onClick={async () => {
              const rows = table.getSelectedRowModel().rows;
              if (rows.length !== 2) return;
              setIsLinkLoading(true);
              try {
                await createTransactionLink({
                  leftId:   (rows[0].original as any).id,
                  rightId:  (rows[1].original as any).id,
                  linkType: selectedLinkType,
                });
                setRowSelection({});
              } finally { setIsLinkLoading(false); }
            }}
            className={btnSec}
          >
            {isLinkLoading ? "linking…" : "link 2"}
          </button>

          <button onClick={() => setRowSelection({})} className={btnSec}>
            clear
          </button>
        </div>
      )}

      {/* ── Card 3: table + footer summary + pagination — fills remaining viewport ── */}
      <AnimateIn delay={90}>
      <div className={`${card} overflow-hidden flex flex-col`}>
        <table className="w-full text-sm">
          <thead className="bg-ink/[0.03] border-b border-ink/10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getCanSort() ? h.column.getToggleSortingHandler() : undefined}
                    className={`px-4 py-2 text-left text-xs font-mono uppercase tracking-wide text-ink/40 whitespace-nowrap select-none ${
                      h.column.getCanSort() ? "cursor-pointer hover:text-ink/70" : ""
                    } ${h.id === "amount" ? "text-right" : ""}`}
                  >
                    <div className={`flex items-center gap-1 ${h.id === "amount" ? "justify-end" : ""}`}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc"  && <span className="text-lime">↑</span>}
                      {h.column.getIsSorted() === "desc" && <span className="text-lime">↓</span>}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Ink/8 hairline dividers — not lime, not cream-soft */}
          <tbody className="divide-y divide-ink/[0.06]">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group hover:bg-cream-soft transition-none">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-3 py-[13px] ${cell.column.id === "amount" ? "text-right" : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colCount} className="py-12 text-center font-pixel text-[11px] text-ink/25">
                  no transactions match.
                </td>
              </tr>
            )}
          </tbody>

          {/* Footer summary */}
          {subtotals.count > 0 && (
            <tfoot>
              <tr className="border-t-2 border-ink bg-ink/[0.03]">
                <td colSpan={colCount - 1} className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink/40">{subtotals.count} tx</span>
                    <span className="text-ink/20 select-none">|</span>
                    <span className="font-mono text-[12px]">
                      <span className="text-ink/30 mr-0.5">↑</span>
                      <span className="text-lime font-semibold tabular-nums">{fmt(animIncome)}</span>
                    </span>
                    <span className="text-ink/20 select-none">|</span>
                    <span className="font-mono text-[12px]">
                      <span className="text-ink/30 mr-0.5">↓</span>
                      <span className="text-ink/60 font-semibold tabular-nums">{fmt(-animExpenses)}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-mono text-[14px] font-bold tabular-nums ${
                    subtotals.net >= 0 ? "text-lime" : "text-ink/80"
                  }`}>
                    {subtotals.net >= 0 ? "↑" : "↓"} {fmt(animNet)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* ── Pagination — inside the card, below tfoot ── */}
        <div className="border-t border-ink/10 px-4 py-2.5 flex items-center justify-between bg-ink/[0.02]">
          <span className="font-mono text-xs text-ink/40">
            page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={btnSec}
            >
              ← prev
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={btnSec}
            >
              next →
            </button>
          </div>
        </div>
      </div>
      </AnimateIn>
    </div>
  );
}

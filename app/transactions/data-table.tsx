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
import { Transaction } from "@/lib/adapters/types";
import { EditModal } from "./edit-modal";
import {
  bulkAssignCategory,
  bulkSetTag,
  setTransactionTag,
  createTransactionLink,
} from "./actions";
import { Rows3 } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";

interface DataTableProps {
  columns: ColumnDef<Transaction>[];
  data: Transaction[];
  categories: string[];
  accounts: { id: string; name: string }[];
  allTags?: string[];
  uncategorizedCount?: number;
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
function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function startOfLastMonth() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function endOfLastMonth() {
  const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "7d",         from: () => daysAgo(7),    to: today },
  { label: "30d",        from: () => daysAgo(30),   to: today },
  { label: "month",      from: startOfMonth,        to: today },
  { label: "last month", from: startOfLastMonth,    to: endOfLastMonth },
  { label: "ytd",        from: startOfYear,         to: today },
  { label: "all",        from: () => "",            to: () => "" },
] as const;

/**
 * On-time = transaction was logged (created_at) within 36h of the transaction date start.
 * Uses created_at from the DB row so it works for any historical row.
 */
function isOnTime(tx: Transaction): boolean {
  try {
    const logged  = new Date((tx as any).created_at).getTime();
    const txStart = new Date(tx.date.slice(0, 10) + "T00:00:00").getTime();
    return logged >= txStart && logged - txStart <= 36 * 3_600_000;
  } catch {
    return false;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function DataTable({
  columns,
  data,
  categories,
  accounts,
  allTags = [],
  uncategorizedCount = 0,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<string>("all");
  const [bulkTagValue, setBulkTagValue] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isBulkTagLoading, setIsBulkTagLoading] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<
    "transfer" | "settlement" | "statement_payment" | "refund"
  >("transfer");
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Filter data ──────────────────────────────────────────────────────────
  const visibleData = useMemo(() => {
    let d = data;
    if (showOnlyUncategorized)
      d = d.filter(
        (t) => !t.category || t.category.trim() === "" || t.category === "Uncategorized",
      );
    if (dateFrom) d = d.filter((t) => t.date.split("T")[0] >= dateFrom);
    if (dateTo) d = d.filter((t) => t.date.split("T")[0] <= dateTo);
    return d;
  }, [data, showOnlyUncategorized, dateFrom, dateTo]);

  // ── Checkbox column (only in bulk mode) ─────────────────────────────────
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

  // ── Subtotals ────────────────────────────────────────────────────────────
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

  const selectedCount = table.getSelectedRowModel().rows.length;
  const colCount = columnsForTable.length;

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setDateFrom(preset.from());
    setDateTo(preset.to());
    setActivePreset(preset.label);
  };

  const toggleBulkMode = () => {
    setBulkMode((v) => { if (v) setRowSelection({}); return !v; });
  };

  return (
    <div>
      <EditModal
        transaction={editingTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        accounts={accounts}
        allTags={allTags}
      />

      {/* ── Single unified card: toolbar + table + pagination ── */}
      <div className="bg-surface border-2 border-ink rounded-md shadow-[2px_2px_0_rgba(31,31,31,0.09)] overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="px-3 pt-2.5 pb-2 space-y-2">

          {/* Row 1: Search + date + bulk toggle */}
          <div className="flex items-center gap-3">
            <input
              placeholder="search transactions…"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-7 min-w-[160px] flex-1 border-2 border-ink/20 rounded-md bg-cream px-3 font-sans text-[12px] text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50 transition-none"
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
              title="Enable bulk edit mode (select + assign categories/tags)"
              className={`flex items-center gap-1.5 h-7 px-2.5 border-2 rounded-md font-pixel text-[10px] transition-none shrink-0 ${
                bulkMode
                  ? "border-ink bg-ink text-cream-soft"
                  : "border-ink/20 text-ink/40 hover:border-ink/40 hover:text-ink/60"
              }`}
            >
              <Rows3 size={10} className="shrink-0" />
              bulk
            </button>
          </div>

          {/* Row 2: Presets + count tightly grouped — no dead zone */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`font-pixel text-[10px] px-2 py-1 border-b-2 transition-none ${
                    activePreset === p.label
                      ? "border-lime text-ink"
                      : "border-transparent text-ink/35 hover:text-ink/60 hover:border-ink/20"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Count immediately adjacent to last preset, no dead zone */}
            <span className="font-mono text-[10px] text-ink/30">
              {table.getRowModel().rows.length} / {visibleData.length}
            </span>
            {uncategorizedCount > 0 && (
              <label className="flex items-center gap-1.5 font-sans text-[11px] text-ink/45 cursor-pointer">
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

          {/* Bulk operations — only when in bulk mode with rows selected */}
          {bulkMode && selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-ink/10">
              <span className="font-pixel text-[10px] text-ink/40">{selectedCount} selected:</span>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-7 border-2 border-ink/25 rounded-md bg-white px-2 font-sans text-[11px] text-ink focus:outline-none focus:border-ink/50"
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
                className="h-7 border-2 border-ink bg-lime text-ink px-2.5 font-pixel text-[10px] rounded-md shadow-[2px_2px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1F1F1F] disabled:opacity-40 disabled:pointer-events-none transition-none"
              >
                {isBulkLoading ? "assigning…" : "assign"}
              </button>

              <div className="h-4 w-px bg-ink/15" />

              <datalist id="bulk-tags-list">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
              <input
                list="bulk-tags-list"
                value={bulkTagValue}
                onChange={(e) => setBulkTagValue(e.target.value)}
                placeholder="tag name…"
                className="h-7 w-28 border-2 border-ink/25 rounded-md bg-white px-2 font-mono text-[11px] placeholder:text-ink/25 focus:outline-none focus:border-ink/50"
              />
              <button
                disabled={isBulkTagLoading || !bulkTagValue.trim()}
                onClick={async () => {
                  const ids = table.getSelectedRowModel().rows.map((r) => (r.original as any).id as string);
                  setIsBulkTagLoading(true);
                  try { await bulkSetTag(ids, bulkTagValue.trim()); setRowSelection({}); setBulkTagValue(""); }
                  finally { setIsBulkTagLoading(false); }
                }}
                className="h-7 border-2 border-ink/30 text-ink px-2.5 font-pixel text-[10px] rounded-md hover:border-ink/60 disabled:opacity-40 disabled:pointer-events-none transition-none"
              >
                {isBulkTagLoading ? "tagging…" : "tag"}
              </button>

              <div className="h-4 w-px bg-ink/15" />

              <select
                value={selectedLinkType}
                onChange={(e) => setSelectedLinkType(e.target.value as any)}
                className="h-7 border-2 border-ink/25 rounded-md bg-white px-2 font-sans text-[11px] text-ink focus:outline-none"
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
                      leftId: (rows[0].original as any).id,
                      rightId: (rows[1].original as any).id,
                      linkType: selectedLinkType,
                    });
                    setRowSelection({});
                  } finally { setIsLinkLoading(false); }
                }}
                className="h-7 border-2 border-ink/30 text-ink px-2.5 font-pixel text-[10px] rounded-md hover:border-ink/60 disabled:opacity-40 disabled:pointer-events-none transition-none"
              >
                {isLinkLoading ? "linking…" : "link 2"}
              </button>

              <button
                onClick={() => setRowSelection({})}
                className="h-7 border-2 border-ink/15 text-ink/40 px-2.5 font-pixel text-[10px] rounded-md hover:border-ink/30 hover:text-ink/60 transition-none"
              >
                clear
              </button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="border-t border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.03]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getCanSort() ? h.column.getToggleSortingHandler() : undefined}
                      className={`px-3 py-2 text-left font-pixel text-[10px] text-ink/40 whitespace-nowrap select-none ${
                        h.column.getCanSort() ? "cursor-pointer hover:text-ink/70" : ""
                      } ${h.id === "amount" ? "text-right" : ""}`}
                    >
                      <div className={`flex items-center gap-1 ${h.id === "amount" ? "justify-end" : ""}`}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" && <span className="text-lime">↑</span>}
                        {h.column.getIsSorted() === "desc" && <span className="text-lime">↓</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Hairline dividers, density-reduced row height */}
            <tbody className="divide-y divide-cream-soft">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => {
                  const onTime = isOnTime(row.original);
                  return (
                    <tr
                      key={row.id}
                      className={`group hover:bg-cream-soft transition-none border-l-2 ${
                        onTime ? "border-lime" : "border-transparent"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-3 py-1.5 ${cell.column.id === "amount" ? "text-right" : ""}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={colCount} className="py-12 text-center font-pixel text-[11px] text-ink/25">
                    no transactions match.
                  </td>
                </tr>
              )}
            </tbody>

            {/* ── Subtotals footer ── */}
            {subtotals.count > 0 && (
              <tfoot>
                <tr className="border-t-2 border-ink bg-ink/[0.03]">
                  <td colSpan={colCount - 1} className="px-3 py-2.5">
                    {/* Tightly grouped with pipe dividers */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink/40">
                        {subtotals.count} tx
                      </span>
                      <span className="text-ink/20 font-mono text-[11px]">|</span>
                      <span className="font-mono text-[12px]">
                        <span className="text-ink/30 mr-0.5">↑</span>
                        <span className="text-lime font-semibold tabular-nums">{fmt(subtotals.income)}</span>
                      </span>
                      <span className="text-ink/20 font-mono text-[11px]">|</span>
                      <span className="font-mono text-[12px]">
                        <span className="text-ink/30 mr-0.5">↓</span>
                        <span className="text-ink/60 font-semibold tabular-nums">{fmt(subtotals.expenses)}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-mono text-[14px] font-bold tabular-nums ${
                      subtotals.net >= 0 ? "text-lime" : "text-ink/80"
                    }`}>
                      {subtotals.net >= 0 ? "↑" : "↓"} {fmt(Math.abs(subtotals.net))}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── Pagination — INSIDE the card, below tfoot ── */}
        <div className="border-t border-ink/10 px-3 py-2 flex items-center justify-between">
          <span className="font-pixel text-[10px] text-ink/30">
            page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-6 border-2 border-ink/20 rounded-md px-2.5 font-pixel text-[9px] text-ink/50 hover:border-ink/50 hover:text-ink disabled:opacity-30 disabled:pointer-events-none transition-none"
            >
              ← prev
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-6 border-2 border-ink/20 rounded-md px-2.5 font-pixel text-[9px] text-ink/50 hover:border-ink/50 hover:text-ink disabled:opacity-30 disabled:pointer-events-none transition-none"
            >
              next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

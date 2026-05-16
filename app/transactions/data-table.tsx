"use client";

import {
  ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, getPaginationRowModel, SortingState,
  useReactTable, RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Transaction } from "@/lib/adapters/types";
import { EditModal } from "./edit-modal";
import {
  bulkAssignCategory, bulkSetTag, setTransactionTag, createTransactionLink,
} from "./actions";
import { Tag } from "lucide-react";
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
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

// ── Quick date preset helpers ──────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}
function startOfYear() { return `${new Date().getFullYear()}-01-01`; }
function startOfMonth() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function startOfLastMonth() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function endOfLastMonth() {
  const d = new Date(); d.setDate(0);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "7d",   from: () => daysAgo(7),        to: today },
  { label: "30d",  from: () => daysAgo(30),        to: today },
  { label: "Month", from: startOfMonth,             to: today },
  { label: "Last month", from: startOfLastMonth,   to: endOfLastMonth },
  { label: "YTD",  from: startOfYear,              to: today },
  { label: "All",  from: () => "",                 to: () => "" },
] as const;

export function DataTable({
  columns, data, categories, accounts, allTags = [], uncategorizedCount = 0,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<string>("All");
  const [bulkTagValue, setBulkTagValue] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isBulkTagLoading, setIsBulkTagLoading] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<"transfer" | "settlement" | "statement_payment" | "refund">("transfer");
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Filter data ───────────────────────────────────────────────────
  const visibleData = useMemo(() => {
    let d = data;
    if (showOnlyUncategorized)
      d = d.filter((t) => !t.category || t.category.trim() === "" || t.category === "Uncategorized");
    if (activeTagFilter) d = d.filter((t) => (t as any).tag === activeTagFilter);
    if (dateFrom) d = d.filter((t) => t.date.split("T")[0] >= dateFrom);
    if (dateTo) d = d.filter((t) => t.date.split("T")[0] <= dateTo);
    return d;
  }, [data, showOnlyUncategorized, activeTagFilter, dateFrom, dateTo]);

  // ── Checkbox column ───────────────────────────────────────────────
  const selectionColumn = useMemo<ColumnDef<Transaction>>(() => ({
    id: "select",
    header: ({ table }) => (
      <input type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="accent-indigo-600"
      />
    ),
    cell: ({ row }) => (
      <input type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        className="accent-indigo-600"
      />
    ),
    enableSorting: false, enableHiding: false, size: 30,
  }), []);

  const columnsWithSelection = useMemo(() => [selectionColumn, ...columns], [selectionColumn, columns]);

  const table = useReactTable({
    data: visibleData,
    columns: columnsWithSelection,
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

  // ── Subtotals from ALL filtered rows (not just current page) ──────
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

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setDateFrom(preset.from());
    setDateTo(preset.to());
    setActivePreset(preset.label);
  };

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

      {/* ── Toolbar ── */}
      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] p-4 space-y-3">

        {/* Row 1: Search + date range */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Search transactions…"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-9 min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
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
        </div>

        {/* Row 2: Presets + uncategorized + count */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`h-7 rounded-lg px-2.5 text-xs font-medium transition ${
                  activePreset === p.label
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {uncategorizedCount > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyUncategorized}
                  onChange={(e) => { setShowOnlyUncategorized(e.target.checked); setRowSelection({}); }}
                  className="accent-amber-500"
                />
                Uncategorized ({uncategorizedCount})
              </label>
            )}
            <span className="text-xs text-slate-400">
              {table.getRowModel().rows.length} of {visibleData.length}
            </span>
          </div>
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3 h-3 text-slate-400 shrink-0" />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                className={`h-6 rounded-full px-2.5 text-[11px] font-medium border transition ${
                  activeTagFilter === tag
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Bulk operations — only show when rows are selected */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500">{selectedCount} selected:</span>

            {/* Bulk category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Assign category…</option>
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
              className="h-8 rounded-xl bg-slate-800 px-3 text-xs font-medium text-white hover:bg-slate-900 transition disabled:opacity-50"
            >
              {isBulkLoading ? "Assigning…" : "Assign"}
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* Bulk tag */}
            <datalist id="bulk-tags-list">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
            <input
              list="bulk-tags-list"
              value={bulkTagValue}
              onChange={(e) => setBulkTagValue(e.target.value)}
              placeholder="Tag name…"
              className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-28"
            />
            <button
              disabled={isBulkTagLoading || !bulkTagValue.trim()}
              onClick={async () => {
                const ids = table.getSelectedRowModel().rows.map((r) => (r.original as any).id as string);
                setIsBulkTagLoading(true);
                try { await bulkSetTag(ids, bulkTagValue.trim()); setRowSelection({}); setBulkTagValue(""); }
                finally { setIsBulkTagLoading(false); }
              }}
              className="h-8 rounded-xl bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isBulkTagLoading ? "Tagging…" : "Tag"}
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* Link */}
            <select
              value={selectedLinkType}
              onChange={(e) => setSelectedLinkType(e.target.value as any)}
              className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none"
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
              className="h-8 rounded-xl bg-violet-600 px-3 text-xs font-medium text-white hover:bg-violet-700 transition disabled:opacity-50"
            >
              {isLinkLoading ? "Linking…" : "Link 2"}
            </button>

            <button
              onClick={() => setRowSelection({})}
              className="h-8 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getCanSort() ? h.column.getToggleSortingHandler() : undefined}
                    className={`px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none ${
                      h.column.getCanSort() ? "cursor-pointer hover:text-slate-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc" && <span>↑</span>}
                      {h.column.getIsSorted() === "desc" && <span>↓</span>}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-slate-50">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group hover:bg-slate-50/60 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnsWithSelection.length} className="py-16 text-center text-sm text-slate-400">
                  No transactions match the current filters.
                </td>
              </tr>
            )}
          </tbody>

          {/* ── Subtotals footer ── */}
          {subtotals.count > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/80">
                <td colSpan={columnsWithSelection.length - 1} className="px-4 py-3">
                  <div className="flex items-center gap-5 text-xs text-slate-500">
                    <span className="font-medium">{subtotals.count} transaction{subtotals.count !== 1 ? "s" : ""}</span>
                    <span>
                      <span className="text-slate-400">In </span>
                      <span className="font-semibold text-emerald-600 tabular-nums font-mono">{fmt(subtotals.income)}</span>
                    </span>
                    <span>
                      <span className="text-slate-400">Out </span>
                      <span className="font-semibold text-rose-600 tabular-nums font-mono">{fmt(subtotals.expenses)}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-bold tabular-nums font-mono ${subtotals.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {fmt(subtotals.net)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between py-2 px-1">
        <span className="text-xs text-slate-400">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
          >
            ← Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

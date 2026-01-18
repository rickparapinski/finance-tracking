"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel, // <--- Import this
  SortingState,
  useReactTable,
  RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Transaction } from "@/lib/adapters/types";
import { EditModal } from "./edit-modal";
import { bulkAssignCategory, createTransactionLink } from "./actions"; // Import the modal

interface DataTableProps {
  columns: ColumnDef<Transaction>[];
  data: Transaction[];
  categories: string[];
  uncategorizedCount: number;
}

export function DataTable({
  columns,
  data,
  categories,
  uncategorizedCount,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<
    "transfer" | "settlement" | "statement_payment" | "refund"
  >("transfer");
  const [isLinkLoading, setIsLinkLoading] = useState(false);

  // Modal State
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  //Uncategorized filter
  const visibleData = useMemo(() => {
    if (!showOnlyUncategorized) return data;
    return data.filter(
      (t) =>
        !t.category ||
        t.category.trim() === "" ||
        t.category === "Uncategorized",
    );
  }, [data, showOnlyUncategorized]);

  //checkbox selection
  const selectionColumn = useMemo<ColumnDef<Transaction>>(
    () => ({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (!el) return;
            el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 30,
    }),
    [],
  );

  const columnsWithSelection = useMemo(
    () => [selectionColumn, ...columns],
    [selectionColumn, columns],
  );

  const table = useReactTable({
    data: visibleData,
    columns: columnsWithSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    meta: {
      openEditModal: (t) => {
        setEditingTransaction(t);
        setIsModalOpen(true);
      },
    },
  });

  return (
    <div className="space-y-4">
      <EditModal
        transaction={editingTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
      />

      <div id="uncategorized" className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            placeholder="Filter transactions..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="h-10 w-full md:w-80 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showOnlyUncategorized}
                onChange={(e) => {
                  setShowOnlyUncategorized(e.target.checked);
                  setRowSelection({});
                }}
              />
              Show only uncategorized ({uncategorizedCount})
            </label>

            <div className="text-xs text-slate-500">
              Showing {table.getRowModel().rows.length} of {visibleData.length}{" "}
              results
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">Assign category…</option>
            {categories
              .filter((c) => c !== "Uncategorized")
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          <button
            className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-medium text-white hover:opacity-90 transition disabled:opacity-60"
            disabled={
              isBulkLoading ||
              !selectedCategory ||
              table.getSelectedRowModel().rows.length === 0
            }
            onClick={async () => {
              const ids = table
                .getSelectedRowModel()
                .rows.map((r) => (r.original as any).id as string);

              setIsBulkLoading(true);
              try {
                await bulkAssignCategory(ids, selectedCategory);
                setRowSelection({});
              } finally {
                setIsBulkLoading(false);
              }
            }}
          >
            {isBulkLoading
              ? "Assigning..."
              : `Assign to selected (${table.getSelectedRowModel().rows.length})`}
          </button>

          <button
            className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-60"
            disabled={table.getSelectedRowModel().rows.length === 0}
            onClick={() => setRowSelection({})}
          >
            Clear selection
          </button>
          <div className="h-9 w-px bg-slate-200 mx-1" />

          <select
            value={selectedLinkType}
            onChange={(e) => setSelectedLinkType(e.target.value as any)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="transfer">Link as transfer</option>
            <option value="settlement">Link as settlement</option>
            <option value="statement_payment">Link as statement payment</option>
            <option value="refund">Link as refund</option>
          </select>

          <button
            className="h-9 rounded-xl bg-indigo-600 px-4 text-xs font-medium text-white hover:opacity-90 transition disabled:opacity-60"
            disabled={
              isLinkLoading || table.getSelectedRowModel().rows.length !== 2
            }
            onClick={async () => {
              const rows = table.getSelectedRowModel().rows;
              if (rows.length !== 2) return;

              const leftId = (rows[0].original as any).id as string;
              const rightId = (rows[1].original as any).id as string;

              setIsLinkLoading(true);
              try {
                await createTransactionLink({
                  leftId,
                  rightId,
                  linkType: selectedLinkType,
                });
                setRowSelection({});
              } finally {
                setIsLinkLoading(false);
              }
            }}
          >
            {isLinkLoading ? "Linking..." : "Link 2 selected"}
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                    className={`
  px-4 py-3 whitespace-nowrap select-none
  font-medium text-slate-600 transition-colors
  ${header.column.getCanSort() ? "cursor-pointer hover:text-slate-900 hover:bg-slate-100" : ""}
`}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <span className="ml-1 text-xs text-slate-400">
                          {{
                            asc: "↑",
                            desc: "↓",
                          }[header.column.getIsSorted() as string] ?? ""}
                        </span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columnsWithSelection.length}
                  className="h-24 text-center text-zinc-500"
                >
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-3 py-4">
        <button
          className="
  h-9 rounded-xl px-4 text-xs font-medium
  border border-slate-300
  text-slate-700
  hover:bg-slate-100
  disabled:border-slate-200
  disabled:text-slate-400
  disabled:hover:bg-transparent
  transition
"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </button>
        <span className="text-xs text-zinc-500">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
        <button
          className="
  h-9 rounded-xl px-4 text-xs font-medium
  border border-slate-300
  text-slate-700
  hover:bg-slate-100
  disabled:border-slate-200
  disabled:text-slate-400
  disabled:hover:bg-transparent
  transition
"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </button>
      </div>
    </div>
  );
}

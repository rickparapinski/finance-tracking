"use client";

import { useState, Fragment } from "react";
import { updateForecastInstanceAmount } from "./actions";
import { formatCurrency } from "@/lib/finance-utils";
import { Segs } from "@/components/ui/segs";

// ─── shared types (imported by page.tsx) ─────────────────────────────────
export type CommittedItem = {
  id: string;
  date: string;
  amount: number;
  status: "projected" | "realized" | "skipped";
  ruleId?: string;
  ruleName?: string;
  category?: string;
  note?: string | null;
  transaction_id?: string | null;
};

export type BudgetItem = {
  category: string;
  ruleName: string;
  cap: number;      // negative = expense cap
  spent: number;    // negative = what was spent (asset-account only)
  remaining: number;
  ruleId: string;
};

export type MonthRow = {
  key: string;
  label: string;
  isPast: boolean;
  isCurrent: boolean;
  floorOpening: number;
  ceilOpening: number;
  floorClosing: number;
  ceilClosing: number;
  actual: number;
  committedProjected: number;
  budgetCap: number;
  budgetSpent: number;
  budgetRemaining: number;
  committedItems: CommittedItem[];
  budgetItems: BudgetItem[];
};

// ─── constants ────────────────────────────────────────────────────────────
const COLS = "grid-cols-[1fr_108px_108px_176px_216px]";

// ─── helpers ──────────────────────────────────────────────────────────────
function budgetFilled(spent: number, cap: number): number {
  if (cap === 0) return 0;
  return Math.min(8, Math.round((Math.abs(spent) / Math.abs(cap)) * 8));
}

function isOverBudget(spent: number, cap: number): boolean {
  return cap !== 0 && Math.abs(spent) > Math.abs(cap);
}

// ─── StatusBadge ─────────────────────────────────────────────────────────
function StatusBadge({ status, isLinked }: { status: string; isLinked: boolean }) {
  if (status === "realized" || isLinked) {
    return (
      <span className="inline-flex items-center px-1.5 py-px bg-lime border border-ink/30 font-mono text-[9px] text-ink uppercase">
        done
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center px-1.5 py-px bg-cream-soft border border-ink/20 font-mono text-[9px] text-ink-soft uppercase">
        skip
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-px bg-cream border border-ink/20 font-mono text-[9px] text-ink-soft uppercase">
      soon
    </span>
  );
}

// ─── EditableAmount ───────────────────────────────────────────────────────
function EditableAmount({
  item,
  editingId,
  setEditingId,
}: {
  item: CommittedItem;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const [val, setVal] = useState(String(item.amount));

  if (item.status === "realized" || item.transaction_id) {
    return <span className="font-mono text-xs text-ink">{formatCurrency(item.amount)}</span>;
  }

  if (editingId === item.id) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await updateForecastInstanceAmount(item.id, parseFloat(val));
          setEditingId(null);
        }}
        className="flex justify-end"
      >
        <input
          autoFocus
          className="w-20 text-right font-mono text-xs p-1 border-2 border-ink bg-cream-soft focus:outline-none"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => setEditingId(null)}
        />
      </form>
    );
  }

  return (
    <button
      onClick={() => setEditingId(item.id)}
      className="font-mono text-xs text-ink hover:bg-lime/20 px-1 transition-none cursor-text"
    >
      {formatCurrency(item.amount)}
    </button>
  );
}

// ─── BudgetDetailRow ──────────────────────────────────────────────────────
function BudgetDetailRow({ item }: { item: BudgetItem }) {
  const filled = budgetFilled(item.spent, item.cap);
  const over = isOverBudget(item.spent, item.cap);
  const capAbs = Math.abs(item.cap);
  const spentAbs = Math.abs(item.spent);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-ink/10 last:border-0 ${
        over ? "bg-ink" : ""
      }`}
    >
      <div className={`w-32 font-mono text-xs truncate ${over ? "text-cream-soft" : "text-ink"}`}>
        {item.category}
      </div>
      <div className="flex-1">
        <Segs filled={filled} total={8} dark={over} />
      </div>
      <div
        className={`font-mono text-[10px] w-32 text-right ${
          over ? "text-cream-soft" : "text-ink-soft"
        }`}
      >
        {formatCurrency(spentAbs)} / {formatCurrency(capAbs)}
      </div>
      <div
        className={`font-mono text-[10px] w-24 text-right ${
          over ? "text-cream-soft font-bold" : "text-ink-soft"
        }`}
      >
        {over
          ? `+${formatCurrency(spentAbs - capAbs)} over`
          : `${formatCurrency(Math.abs(item.remaining))} left`}
      </div>
    </div>
  );
}

// ─── BudgetSummaryBar (month-row level) ──────────────────────────────────
function BudgetSummaryBar({ row }: { row: MonthRow }) {
  if (row.budgetCap === 0) {
    return <span className="font-mono text-[10px] text-ink/25">—</span>;
  }

  const filled = budgetFilled(row.budgetSpent, row.budgetCap);
  const over = isOverBudget(row.budgetSpent, row.budgetCap);
  const spentAbs = Math.abs(row.budgetSpent);
  const capAbs = Math.abs(row.budgetCap);
  const remainAbs = Math.abs(row.budgetRemaining);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 min-w-0">
        <Segs filled={filled} total={8} />
      </div>
      <div className="font-mono text-[10px] text-ink-soft shrink-0 text-right w-20">
        {row.isPast ? (
          <span>{formatCurrency(spentAbs)}</span>
        ) : row.isCurrent ? (
          <span>{formatCurrency(spentAbs)} / {formatCurrency(capAbs)}</span>
        ) : (
          over ? (
            <span className="text-ink">over</span>
          ) : (
            <span>cap {formatCurrency(capAbs)}</span>
          )
        )}
      </div>
    </div>
  );
}

// ─── ExpandedDetail ───────────────────────────────────────────────────────
function ExpandedDetail({
  row,
  editingId,
  setEditingId,
}: {
  row: MonthRow;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const hasCommitted = row.committedItems.length > 0;
  const hasBudgets = row.budgetItems.length > 0;

  if (!hasCommitted && !hasBudgets) {
    return (
      <div className="px-6 py-5 text-center font-mono text-xs text-ink/30">
        no items in this period.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 bg-cream/40">
      {hasCommitted && (
        <div>
          <div className="font-pixel text-[10px] text-ink-soft uppercase tracking-widest mb-2 px-1">
            committed
          </div>
          <div className="pixel-box bg-surface overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {row.committedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-ink/5 last:border-0 hover:bg-lime/5 transition-none group"
                  >
                    <td className="px-3 py-2.5 font-mono text-[10px] text-ink-soft w-14">
                      {item.date.slice(8)}.{item.date.slice(5, 7)}
                    </td>
                    <td className="px-3 py-2.5 font-sans text-ink">
                      <div className="text-xs">{item.ruleName}</div>
                      {item.category && (
                        <div className="text-[10px] text-ink-soft">{item.category}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 w-16">
                      <StatusBadge status={item.status} isLinked={!!item.transaction_id} />
                    </td>
                    <td className="px-3 py-2.5 text-right w-28">
                      <EditableAmount
                        item={item}
                        editingId={editingId}
                        setEditingId={setEditingId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasBudgets && (
        <div>
          <div className="font-pixel text-[10px] text-ink-soft uppercase tracking-widest mb-2 px-1">
            budgets
          </div>
          <div className="pixel-box bg-surface overflow-hidden">
            {row.budgetItems.map((item) => (
              <BudgetDetailRow key={item.ruleId} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────
export function ForecastTable({
  rows,
  openingBalance,
}: {
  rows: MonthRow[];
  openingBalance: number;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="pixel-box bg-surface overflow-hidden">
      {/* Panel header */}
      <div className="bg-ink px-5 py-3 flex items-center justify-between">
        <span className="font-pixel text-sm text-cream-soft">monthly breakdown</span>
        <span className="font-mono text-[9px] text-cream-soft/40 uppercase tracking-widest hidden sm:block">
          floor = committed · ceiling = +budgets
        </span>
      </div>

      {/* Column labels */}
      <div className={`grid ${COLS} px-5 py-2 border-b border-ink/10 bg-cream/60`}>
        <span className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest">month</span>
        <span className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest text-right">opening</span>
        <span className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest text-right">flows</span>
        <span className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest pl-2">budgets</span>
        <span className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest text-right">closing</span>
      </div>

      {/* Opening balance anchor row */}
      <div className={`grid ${COLS} px-5 py-2.5 border-b-2 border-ink/10 bg-lime/8`}>
        <div className="font-pixel text-[10px] text-ink/50 self-center">liquid start</div>
        <div />
        <div />
        <div />
        <div className="font-mono font-bold text-sm text-ink text-right self-center">
          {formatCurrency(openingBalance)}
        </div>
      </div>

      {/* Month rows */}
      {rows.map((row) => {
        const isOpen = openMonth === row.key;
        const netFlows = row.floorClosing - row.floorOpening;
        const hasRange = !row.isPast && Math.abs(row.budgetRemaining) > 0.01;
        const hasProjected =
          row.committedItems.some((i) => i.status === "projected") ||
          (!row.isPast && row.budgetCap !== 0);

        return (
          <Fragment key={row.key}>
            {/* Summary row */}
            <div
              onClick={() => setOpenMonth((m) => (m === row.key ? null : row.key))}
              className={`grid ${COLS} px-5 py-4 border-b border-ink/10 cursor-pointer transition-none select-none ${
                isOpen
                  ? "bg-cream/70"
                  : row.isCurrent
                  ? "bg-lime/5 hover:bg-lime/10"
                  : "hover:bg-cream/50"
              }`}
            >
              {/* Month label */}
              <div className="flex items-center gap-2 self-center">
                <span
                  className={`size-1.5 shrink-0 ${
                    hasProjected ? "bg-ink/35" : "bg-ink/10"
                  }`}
                />
                <span className="font-pixel text-sm text-ink">{row.label}</span>
                {row.isCurrent && (
                  <span className="bg-lime px-1.5 py-px font-mono text-[8px] text-ink uppercase tracking-wider shrink-0">
                    now
                  </span>
                )}
              </div>

              {/* Opening */}
              <div className="font-mono text-xs text-ink-soft text-right self-center">
                {formatCurrency(row.floorOpening)}
              </div>

              {/* Net flows (committed/actual) */}
              <div className="font-mono text-xs text-ink text-right self-center">
                {netFlows === 0 ? (
                  <span className="text-ink/25">—</span>
                ) : (
                  formatCurrency(netFlows)
                )}
              </div>

              {/* Budget bar */}
              <div className="pl-2 self-center">
                <BudgetSummaryBar row={row} />
              </div>

              {/* Closing (floor / range) */}
              <div className="text-right self-center">
                {row.isPast ? (
                  <span className="font-mono font-bold text-sm text-ink">
                    {formatCurrency(row.floorClosing)}
                  </span>
                ) : (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono font-bold text-sm text-ink">
                      {formatCurrency(row.floorClosing)}
                    </span>
                    {hasRange && (
                      <span className="font-mono text-[10px] text-ink-soft">
                        ↓ {formatCurrency(row.ceilClosing)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded detail panel */}
            {isOpen && (
              <div className="border-b border-ink/10">
                <ExpandedDetail
                  row={row}
                  editingId={editingId}
                  setEditingId={setEditingId}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

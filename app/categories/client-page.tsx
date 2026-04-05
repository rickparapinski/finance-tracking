"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CategoryModal } from "./category-modal";
import { getSpendingForCycle } from "./actions";
import { categoryColor } from "@/lib/category-color";

type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
};

type Cycle = { key: string; start_date: string; end_date: string };

export function CategoriesClientPage({
  categories,
  spendingMap: initialSpending,
  cycles,
  currentCycleKey,
  currentStart,
  currentEnd,
}: {
  categories: Category[];
  spendingMap: Record<string, number>;
  cycles: Cycle[];
  currentCycleKey: string;
  currentStart: string;
  currentEnd: string;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [spendingMap, setSpendingMap] = useState(initialSpending);
  const [selectedCycle, setSelectedCycle] = useState(currentCycleKey);
  const [isPending, startTransition] = useTransition();

  const handleCycleChange = (key: string) => {
    setSelectedCycle(key);
    const cycle = cycles.find((c) => c.key === key);
    if (!cycle) return;
    startTransition(async () => {
      const data = await getSpendingForCycle(cycle.start_date, cycle.end_date);
      setSpendingMap(data);
    });
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  // Build cycle options: current first, then past (deduplicated)
  const otherCycles = cycles.filter((c) => c.key !== currentCycleKey);

  function fmtCycleLabel(start: string, end: string) {
    const f = (s: string) => {
      const [y, m, d] = s.split("-");
      return `${parseInt(m)}/${parseInt(d)}/${y}`;
    };
    return `${f(start)} — ${f(end)}`;
  }

  return (
    <div className="space-y-8">
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          router.refresh();
        }}
        categoryToEdit={null}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Categories
          </h1>
          <p className="text-sm text-slate-500">
            Manage spending categories and monthly budgets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCycle}
            onChange={(e) => handleCycleChange(e.target.value)}
            disabled={isPending}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          >
            <option value={currentCycleKey}>
              {fmtCycleLabel(currentStart, currentEnd)} (current)
            </option>
            {otherCycles.map((c) => (
              <option key={c.key} value={c.key}>
                {fmtCycleLabel(c.start_date, c.end_date)}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            + New
          </button>
        </div>
      </div>

      {/* Income section */}
      {income.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Income
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {income.map((c) => (
              <CategoryCard
                key={c.id}
                c={c}
                spent={spendingMap[c.name] ?? 0}
                fmt={fmt}
              />
            ))}
          </div>
        </section>
      )}

      {/* Expense section */}
      {expense.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Expenses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {expense.map((c) => (
              <CategoryCard
                key={c.id}
                c={c}
                spent={spendingMap[c.name] ?? 0}
                fmt={fmt}
              />
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && (
        <div className="rounded-xl bg-white p-12 text-center text-slate-500 text-sm shadow-[var(--shadow-softer)]">
          No categories yet. Create one to get started.
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  c,
  spent,
  fmt,
}: {
  c: Category;
  spent: number;
  fmt: (n: number) => string;
}) {
  const color = categoryColor(c.name, c.color);
  const budget = Number(c.monthly_budget ?? 0);
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const over = budget > 0 && spent > budget;

  return (
    <a
      href={`/categories/${c.id}`}
      className="block rounded-xl bg-white shadow-[var(--shadow-softer)] hover:shadow-md transition-shadow overflow-hidden group"
    >
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-600 transition-colors">
              {c.name}
            </span>
            {!c.is_active && (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                Inactive
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
            {fmt(spent)}
          </span>
        </div>

        {budget > 0 ? (
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: over ? "#ef4444" : color,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {pct}% of {fmt(budget)} budget
              {over && (
                <span className="text-rose-500 ml-1">· over budget</span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">No budget set</p>
        )}
      </div>
    </a>
  );
}

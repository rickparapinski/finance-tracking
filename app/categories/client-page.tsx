"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CategoryModal } from "./category-modal";
import { getSpendingForCycle } from "./actions";
import { CategoryIcon } from "@/components/icons/CategoryIcon";
import { Segs } from "@/components/ui/segs";
import { PageHeader } from "@/components/layout/page-header";
import { CycleSwitcher } from "@/components/ui/cycle-switcher";
import { type Period } from "@/lib/periods";

type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
  slug: string | null;
};

export function CategoriesClientPage({
  categories,
  spendingMap: initialSpending,
  periods,
  currentCycleKey,
}: {
  categories: Category[];
  spendingMap: Record<string, number>;
  periods: Period[];
  currentCycleKey: string;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [spendingMap, setSpendingMap] = useState(initialSpending);
  const [selectedKey, setSelectedKey] = useState(currentCycleKey);
  const [isPending, startTransition]  = useTransition();

  const handlePeriodChange = (period: Period) => {
    setSelectedKey(period.key);
    startTransition(async () => {
      const data = await getSpendingForCycle(period.start_date, period.end_date);
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

  const sortByPct = (a: Category, b: Category) => {
    const budA = Number(a.monthly_budget ?? 0);
    const budB = Number(b.monthly_budget ?? 0);
    if (!budA && !budB) return 0;
    if (!budA) return 1;
    if (!budB) return -1;
    const pctA = (spendingMap[a.name] ?? 0) / budA;
    const pctB = (spendingMap[b.name] ?? 0) / budB;
    return pctB - pctA;
  };

  const income  = categories.filter((c) => c.type === "income").sort(sortByPct);
  const expense = categories.filter((c) => c.type === "expense").sort(sortByPct);

  return (
    <div className="space-y-6">
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); router.refresh(); }}
        categoryToEdit={null}
      />

      {/* ── Header — cycle switcher + new in action slot ── */}
      <PageHeader
        title="categories"
        meta="budgets & spending by cycle"
        action={
          <div className="flex items-center gap-2">
            {/* Cycle switcher — secondary, never lime (lime = "+ new" only) */}
            <CycleSwitcher
              periods={periods}
              currentKey={currentCycleKey}
              selectedKey={selectedKey}
              isPending={isPending}
              onChange={handlePeriodChange}
            />
            {/* Primary action — one lime button per screen */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-8 px-3 flex items-center gap-1 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-none"
            >
              + new
            </button>
          </div>
        }
      />

      {/* Content connects directly to header — no full-width bar in between */}

      {income.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-xs text-ink-soft">income</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {income.map((c) => (
              <CategoryCard key={c.id} c={c} spent={spendingMap[c.name] ?? 0} fmt={fmt} />
            ))}
          </div>
        </section>
      )}

      {expense.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-xs text-ink-soft">expenses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {expense.map((c) => (
              <CategoryCard key={c.id} c={c} spent={spendingMap[c.name] ?? 0} fmt={fmt} />
            ))}
          </div>
        </section>
      )}

      {categories.length === 0 && (
        <div className="border-2 border-ink/10 bg-surface p-12 text-center font-mono text-xs text-ink-soft">
          no categories yet. create one to get started.
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
  const budget   = Number(c.monthly_budget ?? 0);
  const absSpent = Math.abs(spent);
  const pct      = budget > 0 ? Math.min(1, absSpent / budget) : 0;
  const filled   = Math.round(pct * 8);
  const over     = budget > 0 && absSpent > budget;

  return (
    <a
      href={`/categories/${c.slug ?? c.id}`}
      className="block border-2 border-ink bg-surface overflow-hidden shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] transition-none group"
    >
      {over ? (
        <div className="bg-ink px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIcon category={c.name} iconKey={c.color} className="w-6 h-6 shrink-0 text-[#F4EFE3]" />
            <span className="font-mono text-sm text-cream-soft lowercase truncate">{c.name}</span>
            {!c.is_active && <span className="font-mono text-[10px] text-cream-soft/50 shrink-0">inactive</span>}
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-[10px] text-cream-soft/60 block">over budget</span>
            <span className="font-mono text-[10px] text-cream-soft/50">+{fmt(absSpent - budget)}</span>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIcon category={c.name} iconKey={c.color} className="w-6 h-6 shrink-0 text-[#1F1F1F]" />
            <span className="font-mono text-sm text-ink lowercase truncate">{c.name}</span>
            {!c.is_active && (
              <span className="font-mono text-[10px] text-ink-soft bg-ink/5 border border-ink/10 px-1.5 py-0.5 shrink-0">
                inactive
              </span>
            )}
          </div>
          <span className="font-mono text-sm text-ink tabular-nums shrink-0">{fmt(absSpent)}</span>
        </div>
      )}

      <div className="px-4 pb-4 pt-3 space-y-1.5">
        {budget > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <Segs filled={filled} dark={false} className="flex-1 mr-3" />
              {over && <span className="font-mono text-sm text-ink tabular-nums shrink-0">{fmt(absSpent)}</span>}
            </div>
            <p className="font-mono text-[10px] text-ink-soft">
              {Math.round(pct * 100)}% of {fmt(budget)}
            </p>
          </>
        ) : (
          <p className="font-mono text-[10px] text-ink-soft">no budget set</p>
        )}
      </div>
    </a>
  );
}

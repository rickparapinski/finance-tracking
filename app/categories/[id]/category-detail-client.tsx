"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryModal } from "../category-modal";
import { deleteCategory } from "../actions";
import { CategoryIcon } from "@/components/icons/CategoryIcon";
import { RulesPanel } from "./rules-panel";

type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
  slug: string | null;
};

type Rule = {
  id: string;
  pattern: string;
  priority: number;
  is_active: boolean;
};

const btnCls =
  "h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-sm rounded-md " +
  "hover:bg-cream-soft transition-none";

export function CategoryDetailClient({
  category,
  rules,
}: {
  category: Category;
  rules: Rule[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const budget = Number(category.monthly_budget ?? 0);
  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(n);

  const handleDelete = async () => {
    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    await deleteCategory(category.id);
    router.push("/categories");
  };

  return (
    <>
      <CategoryModal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          router.refresh();
        }}
        categoryToEdit={category}
        onDelete={handleDelete}
      />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: icon + name + meta */}
        <div className="flex items-center gap-3">
          <CategoryIcon category={category.name} iconKey={category.color} className="w-6 h-6 text-[#1F1F1F] shrink-0" />
          <div>
            <h1 className="font-pixel text-2xl text-ink leading-none lowercase">
              {category.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="font-mono text-xs text-ink-soft border border-ink rounded-md px-2 py-0.5 lowercase">
                {category.type}
              </span>
              {!category.is_active && (
                <span className="font-mono text-xs text-ink-soft border border-ink/30 rounded-md px-2 py-0.5 lowercase">
                  inactive
                </span>
              )}
              {budget > 0 && (
                <span className="font-mono text-xs text-ink-soft">
                  budget: {fmt(budget)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setEditOpen(true)} className={btnCls}>
            edit
          </button>
          <button
            onClick={() => setRulesOpen((o) => !o)}
            className={rulesOpen
              ? "h-8 px-3 bg-ink text-cream-soft border-2 border-ink font-mono text-sm rounded-md transition-none"
              : btnCls
            }
          >
            rules ({rules.length})
          </button>
          <a href="/categories" className={btnCls + " flex items-center"}>
            ← back
          </a>
        </div>
      </div>

      {/* ── Rules panel ── */}
      <RulesPanel
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        rules={rules}
        categoryId={category.id}
      />
    </>
  );
}

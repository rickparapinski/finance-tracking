"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryModal } from "../category-modal";
import { deleteCategory } from "../actions";
import { CategoryIcon } from "@/components/icons/CategoryIcon";
import { PageHeader } from "@/components/layout/page-header";
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
  "h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-sm " +
  "shadow-[2px_2px_0_#1F1F1F] hover:bg-cream-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none";

export function CategoryDetailClient({
  category,
  rules,
}: {
  category: Category;
  rules: Rule[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen]   = useState(false);
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
        onClose={() => { setEditOpen(false); router.refresh(); }}
        categoryToEdit={category}
        onDelete={handleDelete}
      />

      {/* Page header — back button in Slot A anchors navigation to the title row (P2.5-2) */}
      <PageHeader
        back="/categories"
        title={category.name}
        icon={
          <CategoryIcon
            category={category.name}
            iconKey={category.color}
            className="w-6 h-6 text-ink shrink-0"
          />
        }
        meta={
          [
            category.type,
            !category.is_active ? "inactive" : null,
            budget > 0 ? `budget: ${fmt(budget)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setEditOpen(true)} className={btnCls}>
              edit
            </button>
            <button
              onClick={() => setRulesOpen((o) => !o)}
              className={rulesOpen
                ? "h-8 px-3 bg-ink text-cream-soft border-2 border-ink font-mono text-sm shadow-[2px_2px_0_#5A5A5A] transition-none"
                : btnCls
              }
            >
              rules ({rules.length})
            </button>
          </div>
        }
      />

      {/* Rules panel */}
      <RulesPanel
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        rules={rules}
        categoryId={category.id}
      />
    </>
  );
}

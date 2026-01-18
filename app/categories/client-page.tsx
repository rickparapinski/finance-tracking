"use client";

import { useState } from "react";
import Link from "next/link";
import { CategoryModal } from "./category-modal";
import { deleteCategory } from "./actions";

type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
  sort_order?: number;
};

export function CategoriesClientPage({
  categories,
}: {
  categories: Category[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const handleCreate = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent row click opening modal
    if (!confirm("Are you sure? This cannot be undone.")) return;
    await deleteCategory(id);
  };

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6">
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryToEdit={selectedCategory}
      />

      <div className="rounded-[var(--radius)] bg-white p-6 shadow-[var(--shadow-softer)] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Manage Categories
          </h2>
          <p className="text-xs text-slate-500">
            Define your spending buckets and budgets.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition"
        >
          + New Category
        </button>
      </div>

      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-600">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Budget</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2">Rules</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100">
          {categories.map((c) => (
            <div
              key={c.id}
              onClick={() => handleEdit(c)}
              className="px-6 py-4 hover:bg-slate-50 transition-colors grid grid-cols-12 gap-4 items-center group cursor-pointer"
            >
              {/* Name */}
              <div className="col-span-3 flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full border border-slate-100 shadow-sm"
                  style={{ backgroundColor: c.color || "#e2e8f0" }}
                />
                <span
                  className="text-sm font-medium text-slate-900 truncate"
                  title={c.name}
                >
                  {c.name}
                </span>
              </div>

              {/* Type */}
              <div className="col-span-2">
                <span
                  className={`
                  inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset
                  ${c.type === "income" ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-slate-50 text-slate-600 ring-slate-500/10"}
                `}
                >
                  {c.type}
                </span>
              </div>

              {/* Budget */}
              <div className="col-span-2 text-right text-sm text-slate-600 font-mono">
                {c.monthly_budget && c.monthly_budget > 0
                  ? fmtCurrency(c.monthly_budget)
                  : "-"}
              </div>

              {/* Status */}
              <div className="col-span-2 text-center">
                {!c.is_active && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>

              {/* Rules Link (Restored) */}
              <div className="col-span-2">
                <Link
                  href={`/categories/${c.id}/rules`}
                  onClick={(e) => e.stopPropagation()} // Important: stop click from opening Edit Modal
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline flex items-center gap-1"
                >
                  Manage rules
                  <span className="text-slate-400">→</span>
                </Link>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={(e) => handleDelete(e, c.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Delete Category"
                >
                  Del
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No categories found. Create one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

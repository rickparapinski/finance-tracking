"use client";

import { useState } from "react";
import { CategoryModal } from "./category-modal";
import { Button } from "@/components/ui/button";

// Re-defining the type here or import from a shared types file
type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
  sort_order?: number; // Optional if you have it
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
        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          + New Category
        </Button>
      </div>

      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-600">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Budget</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {categories.map((c) => (
            <div
              key={c.id}
              className="px-6 py-4 hover:bg-slate-50 transition-colors grid grid-cols-12 gap-4 items-center group cursor-pointer"
              onClick={() => handleEdit(c)} // Clicking row opens edit
            >
              {/* Name */}
              <div className="col-span-4 flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full border border-slate-100 shadow-sm"
                  style={{ backgroundColor: c.color || "#e2e8f0" }}
                />
                <span className="text-sm font-medium text-slate-900">
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

              {/* Edit Button */}
              <div className="col-span-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-slate-500 hover:text-slate-900"
                >
                  Edit
                </Button>
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

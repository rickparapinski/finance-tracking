"use client";

import { useEffect, useState } from "react";
import { createCategory, updateCategory } from "./actions";

// Define the shape of a Category based on your DB
type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  is_active: boolean;
  monthly_budget: number | null;
};

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null; // If null, we are creating
}

export function CategoryModal({
  isOpen,
  onClose,
  categoryToEdit,
}: CategoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    type: "expense",
    budget: "",
    color: "",
    isActive: true,
  });

  // Initialize form when opening / switching category
  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setForm({
          name: categoryToEdit.name,
          type: categoryToEdit.type,
          budget: String(categoryToEdit.monthly_budget ?? ""),
          color: categoryToEdit.color ?? "",
          isActive: categoryToEdit.is_active,
        });
      } else {
        // Reset for "Create New"
        setForm({
          name: "",
          type: "expense",
          budget: "",
          color: "",
          isActive: true,
        });
      }
    }
  }, [isOpen, categoryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("type", form.type);
    formData.append("monthly_budget", form.budget);
    formData.append("color", form.color);
    if (form.isActive) formData.append("is_active", "on");

    try {
      if (categoryToEdit) {
        formData.append("id", categoryToEdit.id);
        await updateCategory(formData);
      } else {
        await createCategory(formData);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {categoryToEdit ? "Edit Category" : "New Category"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name & Color Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Groceries"
                required
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Color
              </label>
              <input
                type="color"
                value={form.color || "#94a3b8"}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Type & Budget Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Budget (€)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="0"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 text-right"
                />
              </div>
            </div>
          </div>

          {/* Active Status (Only shown on Edit, similar to how Transaction modal might handle extra options) */}
          {categoryToEdit && (
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                />
                <span className="text-sm text-slate-700">Active Category</span>
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition disabled:opacity-60"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createCategory, updateCategory, deleteCategory } from "./actions";

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
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [budget, setBudget] = useState("0");
  const [color, setColor] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset or Populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setType(categoryToEdit.type);
        setBudget(String(categoryToEdit.monthly_budget ?? 0));
        setColor(categoryToEdit.color ?? "");
        setIsActive(categoryToEdit.is_active);
      } else {
        // Reset for "Create New"
        setName("");
        setType("expense");
        setBudget("0");
        setColor("");
        setIsActive(true);
      }
    }
  }, [isOpen, categoryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("type", type);
    formData.append("monthly_budget", budget);
    formData.append("color", color);
    if (isActive) formData.append("is_active", "on");

    try {
      if (categoryToEdit) {
        formData.append("id", categoryToEdit.id);
        await updateCategory(formData);
      } else {
        await createCategory(formData);
      }
      onClose(); // Close on success
    } catch (error) {
      console.error(error);
      alert("Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToEdit || !confirm("Are you sure? This cannot be undone."))
      return;
    setIsLoading(true);
    try {
      await deleteCategory(categoryToEdit.id);
      onClose();
    } catch (e) {
      alert("Error deleting");
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Groceries"
                required
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Color
              </label>
              <input
                type="color"
                value={color || "#94a3b8"}
                onChange={(e) => setColor(e.target.value)}
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
                value={type}
                onChange={(e) => setType(e.target.value)}
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
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Active Status (Only for Edit) */}
          {categoryToEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
              />
              <label
                htmlFor="is_active"
                className="text-sm text-slate-700 cursor-pointer select-none"
              >
                Active Category
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-between gap-2">
            <div>
              {categoryToEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
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
          </div>
        </form>
      </div>
    </div>
  );
}

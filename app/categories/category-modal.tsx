"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createCategory, updateCategory } from "./actions";

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
  categoryToEdit?: Category | null;
}

// ── Design-system tokens ───────────────────────────────────────────────────────
const labelCls = "block text-xs font-mono text-ink-soft mb-1";
const inputCls =
  "h-9 w-full rounded-md border-2 border-ink bg-white px-3 text-sm text-ink " +
  "placeholder:text-ink/30 focus:outline-none focus:border-ink/70 transition-none";

export function CategoryModal({
  isOpen,
  onClose,
  categoryToEdit,
}: CategoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "expense",
    budget: "",
    color: "",
    isActive: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (categoryToEdit) {
      setForm({
        name: categoryToEdit.name,
        type: categoryToEdit.type,
        budget: String(categoryToEdit.monthly_budget ?? ""),
        color: categoryToEdit.color ?? "",
        isActive: categoryToEdit.is_active,
      });
    } else {
      setForm({ name: "", type: "expense", budget: "", color: "", isActive: true });
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
    } catch (err) {
      console.error(err);
      alert("Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border-2 border-ink rounded-md shadow-[2px_2px_0_rgba(31,31,31,0.12)] w-full max-w-md overflow-hidden animate-slide-up">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10 bg-ink/[0.02]">
          <h2 className="font-pixel text-sm text-ink">
            {categoryToEdit ? "edit category" : "new category"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 place-items-center rounded-md text-ink/35 hover:bg-cream-soft hover:text-ink transition-none"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* name + color */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className={labelCls}>name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. groceries"
                required
                className={inputCls}
              />
            </div>
            <div className="col-span-1">
              <label className={labelCls}>color</label>
              <input
                type="color"
                value={form.color || "#C5F03A"}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 w-full rounded-md border-2 border-ink bg-white p-1 cursor-pointer focus:outline-none focus:border-ink/70 transition-none"
              />
            </div>
          </div>

          {/* type + budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inputCls}
              >
                <option value="expense">expense</option>
                <option value="income">income</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>budget (€)</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="0"
                className={`${inputCls} text-right`}
              />
            </div>
          </div>

          {/* active toggle — only on edit */}
          {categoryToEdit && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-ink text-ink h-4 w-4 focus:ring-ink/20"
                />
                <span className="font-mono text-sm text-ink">active category</span>
              </label>
            </div>
          )}

          {/* actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface border-2 border-ink text-ink font-mono text-sm rounded-md px-4 py-2 hover:bg-cream-soft transition-none"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#C5F03A] border-2 border-ink text-ink font-mono text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-none"
            >
              {isLoading ? "saving…" : "save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

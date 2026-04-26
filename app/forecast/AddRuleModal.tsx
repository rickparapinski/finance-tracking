"use client";

import { useState } from "react";
import { upsertForecastRule } from "./actions";
import { Loader2, Plus, X } from "lucide-react";

interface Rule {
  id?: string;
  name?: string;
  amount?: number;
  type?: string;
  category?: string;
  account_id?: string;
  start_date?: string;
}

const inputCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1";
const selectCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none";

export function AddRuleModal({
  categories,
  accounts,
  editRule,
  trigger,
  onClose,
}: {
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  editRule?: Rule;
  trigger?: React.ReactNode;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState(editRule?.type ?? "recurring");

  const isEdit = !!editRule?.id;

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  async function onSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await upsertForecastRule(formData);
      handleClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const triggerEl = trigger ?? (
    <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition">
      <Plus className="w-4 h-4" />
      Add Rule
    </button>
  );

  const modal = open && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit Rule" : "New Forecast Rule"}
          </h2>
          <button
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form action={onSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {isEdit && <input type="hidden" name="id" value={editRule.id} />}

          <div>
            <label className={labelCls}>Name</label>
            <input
              name="name"
              required
              placeholder="e.g. Rent"
              defaultValue={editRule?.name}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="-1074.00"
                defaultValue={editRule?.amount}
                className={inputCls}
              />
              <p className="mt-1 text-[10px] text-slate-400">Negative = expense</p>
            </div>
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                name="start_date"
                type="date"
                required
                defaultValue={editRule?.start_date ?? new Date().toISOString().slice(0, 10)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select name="category" required defaultValue={editRule?.category} className={selectCls}>
                <option value="" disabled>Select…</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={selectCls}
              >
                <option value="recurring">Recurring (Monthly)</option>
                <option value="one_off">One-off</option>
                <option value="budget">Budget</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Account</label>
            <select
              name="account_id"
              defaultValue={editRule?.account_id ?? accounts[0]?.id}
              className={selectCls}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div onClick={() => setOpen(true)} className="contents">
        {triggerEl}
      </div>
      {modal}
    </>
  );
}

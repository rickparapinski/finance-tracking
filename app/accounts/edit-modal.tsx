"use client";

import { useState } from "react";
import { upsertAccount } from "./actions";

export type Account = {
  id: string;
  name: string;
  currency: string;
  type: string;
  initial_balance: number;
  status?: "active" | "archived";
};

interface EditAccountModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditAccountModal({
  account,
  isOpen,
  onClose,
}: EditAccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !account) return null;

  const handleSave = async (formData: FormData) => {
    setIsLoading(true);
    await upsertAccount(formData); // Server Action
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Edit account
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
        <form action={handleSave} className="p-6 space-y-4">
          <input type="hidden" name="id" value={account.id} />

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Name
            </label>
            <input
              name="name"
              defaultValue={account.name}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Currency
              </label>
              <select
                name="currency"
                defaultValue={account.currency}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="EUR">EUR</option>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Type
              </label>
              <select
                name="type"
                defaultValue={account.type}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Investment">Investment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Start Balance
            </label>
            <input
              name="initial_balance"
              type="number"
              step="0.01"
              defaultValue={account.initial_balance}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 text-right"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md transition"
            >
              Cancel
            </button>
            <button
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

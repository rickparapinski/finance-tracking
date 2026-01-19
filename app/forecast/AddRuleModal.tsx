"use client";

import { useState } from "react";
import { upsertForecastRule } from "./actions";

export function AddRuleModal({ accountId }: { accountId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setIsLoading(true);
    await upsertForecastRule(formData);
    setIsLoading(false);
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition shadow-sm"
      >
        + Add Rule
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">New Forecast Rule</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form action={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Pay TF Bank"
              className="w-full h-10 px-3 rounded-lg border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Amount
              </label>
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="-1000.00"
                className="w-full h-10 px-3 rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Start Date
              </label>
              <input
                name="start_date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Type
              </label>
              <select
                name="type"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white"
              >
                <option value="recurring">Monthly Recurring</option>
                <option value="one_off">One-off</option>
              </select>
            </div>

            {/* Hidden Account ID - Assuming Main Account for now, or pass it in */}
            <input
              type="hidden"
              name="account_id"
              value={accountId || "1276be39-8e92-47d7-bc09-b2a8cf540566"}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
            >
              {isLoading ? "Saving..." : "Create Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

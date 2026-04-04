"use client";

import { useState } from "react";
import { resetData } from "./actions";

export function ResetDataCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirm, setConfirm] = useState("");

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await resetData();
      setIsOpen(false);
      setConfirm("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="p-6 border border-red-100 rounded-xl bg-red-50/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Reset data</h2>
            <p className="text-sm text-slate-500 mt-1">
              Wipes all transactions, accounts, and cycles. Keeps categories, rules, and forecast rules.
            </p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 transition"
          >
            Reset
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Reset all data?</h2>
              <button
                onClick={() => { setIsOpen(false); setConfirm(""); }}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
                <p className="font-semibold">This will permanently delete:</p>
                <ul className="list-disc list-inside text-red-600 space-y-0.5">
                  <li>All transactions</li>
                  <li>All accounts</li>
                  <li>All custom cycles</li>
                  <li>All forecast instances</li>
                </ul>
                <p className="pt-1">Categories, rules, and forecast rules are kept.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                  Type <span className="font-mono normal-case">reset</span> to confirm
                </label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="reset"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setConfirm(""); }}
                  className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={confirm !== "reset" || isLoading}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 transition disabled:opacity-40"
                >
                  {isLoading ? "Resetting..." : "Reset everything"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

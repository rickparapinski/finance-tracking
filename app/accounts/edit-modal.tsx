// app/accounts/edit-modal.tsx
"use client";

import { useState } from "react";
import { upsertAccount } from "./actions";

export type Account = {
  id: string;
  name: string;
  currency: string;
  type: string;
  initial_balance: number;
  balance?: number;       // native currency
  balance_eur?: number | null; // EUR equivalent
  status?: "active" | "archived";
  nature?: "asset" | "liability";
  color?: string | null;
  initial_balance_eur?: number | null;
  credit_limit?: number | null;
  interest_rate?: number | null;
  loan_original_amount?: number | null;
  monthly_payment?: number | null;
};

interface EditAccountModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_OPTIONS = [
  { label: "Checking",    nature: "asset"     },
  { label: "Savings",     nature: "asset"     },
  { label: "Investment",  nature: "asset"     },
  { label: "Credit Card", nature: "liability" },
  { label: "Loan",        nature: "liability" },
];

export function EditAccountModal({ account, isOpen, onClose }: EditAccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(account?.type || "Checking");
  const [selectedCurrency, setSelectedCurrency] = useState(account?.currency || "EUR");

  if (!isOpen) return null;

  const handleSave = async (formData: FormData) => {
    setIsLoading(true);
    await upsertAccount(formData);
    setIsLoading(false);
    onClose();
  };

  const currentNature = TYPE_OPTIONS.find((t) => t.label === selectedType)?.nature || "asset";
  const isLiability = currentNature === "liability";
  const isCreditCard = selectedType === "Credit Card";
  const isLoan = selectedType === "Loan";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {account ? "Edit account" : "New account"}
          </h2>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        <form action={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <input type="hidden" name="id" value={account?.id || ""} />

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Name</label>
            <input
              name="name"
              required
              defaultValue={account?.name}
              placeholder="e.g. Revolut Main"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Currency</label>
              <select
                name="currency"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="EUR">EUR</option>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Type</label>
              <select
                name="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div
            className={`text-xs px-3 py-2 rounded-lg border ${
              isLiability
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : "bg-emerald-50 text-emerald-700 border-emerald-100"
            }`}
          >
            <span className="font-semibold">{isLiability ? "Liability" : "Asset"}:</span>{" "}
            {isLiability
              ? "Positive balance counts as debt (negative Net Worth)."
              : "Positive balance counts as money you own."}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              {isLoan ? "Current Balance (native currency, negative)" : "Start Balance (native currency)"}
            </label>
            <input
              name="initial_balance"
              type="number"
              step="0.01"
              defaultValue={account?.initial_balance}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 text-right"
            />
          </div>

          {selectedCurrency !== "EUR" && (
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Start Balance in EUR <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input
                name="initial_balance_eur"
                type="number"
                step="0.01"
                defaultValue={account?.initial_balance_eur ?? ""}
                placeholder="Auto-calculated at today's rate"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 text-right"
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                Leave blank to auto-calculate using today's exchange rate.
              </p>
            </div>
          )}

          {/* Credit Card specific */}
          {isCreditCard && (
            <div className="space-y-4 rounded-xl border border-slate-100 p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Card Settings</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    Credit Limit
                  </label>
                  <input
                    name="credit_limit"
                    type="number"
                    step="0.01"
                    defaultValue={account?.credit_limit ?? ""}
                    placeholder="e.g. 2000"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    Annual Interest %
                  </label>
                  <input
                    name="interest_rate"
                    type="number"
                    step="0.01"
                    defaultValue={account?.interest_rate ?? ""}
                    placeholder="e.g. 19.99"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Annual rate — used to estimate monthly interest charge.</p>
                </div>
              </div>
            </div>
          )}

          {/* Loan specific */}
          {isLoan && (
            <div className="space-y-4 rounded-xl border border-slate-100 p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loan Settings</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    Original Amount
                  </label>
                  <input
                    name="loan_original_amount"
                    type="number"
                    step="0.01"
                    defaultValue={account?.loan_original_amount ?? ""}
                    placeholder="e.g. 1000"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Total amount borrowed.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    Monthly Payment
                  </label>
                  <input
                    name="monthly_payment"
                    type="number"
                    step="0.01"
                    defaultValue={account?.monthly_payment ?? ""}
                    placeholder="e.g. 50"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Used to estimate payoff date.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                  Annual Interest %
                </label>
                <input
                  name="interest_rate"
                  type="number"
                  step="0.01"
                  defaultValue={account?.interest_rate ?? ""}
                  placeholder="e.g. 12.5"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          )}

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
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 transition disabled:opacity-60"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

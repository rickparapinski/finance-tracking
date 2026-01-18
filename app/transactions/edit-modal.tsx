"use client";

import { useEffect, useMemo, useState } from "react";
import { Transaction } from "@/lib/adapters/types";
import { updateTransactionWithForecast } from "./actions";

interface EditModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
}

type ForecastPlan =
  | { kind: "none" }
  | { kind: "pay30" }
  | { kind: "repeat_monthly"; monthsAhead: number };

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function addDaysLocal(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonthsClampedLocal(base: Date, months: number) {
  // clamp day-of-month to last day of target month
  const d = new Date(base);
  const day = d.getDate();
  const target = new Date(d);
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

export function EditModal({
  transaction,
  isOpen,
  onClose,
  categories,
}: EditModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [forecastPlan, setForecastPlan] = useState<ForecastPlan>({
    kind: "none",
  });

  // Controlled form state so preview updates
  const [form, setForm] = useState({
    date: "",
    amount: "",
    description: "",
    category: "Uncategorized",
  });

  // Initialize form when opening / switching transaction
  useEffect(() => {
    if (!transaction) return;
    setForm({
      date: transaction.date?.split("T")[0] ?? "",
      amount: String(transaction.amount ?? ""),
      description: transaction.description ?? "",
      category: (transaction.category ?? "").trim() || "Uncategorized",
    });
    setForecastPlan({ kind: "none" });
    setIsLoading(false);
  }, [transaction?.id, isOpen]);

  const preview = useMemo(() => {
    if (forecastPlan.kind === "none") return null;
    if (!form.date) return "Pick a date to preview the forecast.";

    const base = new Date(form.date + "T12:00:00"); // safer than midnight DST edge cases
    if (Number.isNaN(base.getTime())) return "Invalid date.";

    if (forecastPlan.kind === "pay30") {
      const due = addDaysLocal(base, 30);
      return `This payment is expected to happen on ${fmtDate(due)} (in 30 days).`;
    }

    if (forecastPlan.kind === "repeat_monthly") {
      const first = addMonthsClampedLocal(base, 1);
      return `This transaction will repeat monthly starting ${fmtDate(first)} for ${forecastPlan.monthsAhead} months.`;
    }

    return null;
  }, [forecastPlan, form.date]);

  if (!isOpen || !transaction) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateTransactionWithForecast(
        transaction.id,
        {
          // NOTE: if your server action expects account_id too, pass it here.
          // If you don’t edit account_id in the modal, use transaction.account_id.
          account_id: (transaction as any).account_id ?? transaction.accountId, // adjust to your Transaction type
          description: form.description,
          category: form.category,
          amount: Number(form.amount),
          amount_eur: (transaction as any).amount_eur ?? null, // or compute if you have it
          date: form.date,
        },
        forecastPlan,
      );

      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Edit transaction
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 text-right pr-10"
                />
                <span className="absolute right-3 top-2 text-xs text-zinc-400">
                  {transaction.original_currency}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
              Category
            </label>

            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="Uncategorized">Uncategorized</option>
              {categories
                .filter((c) => c && c !== "Uncategorized")
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
              Forecast
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForecastPlan({ kind: "pay30" })}
                className={[
                  "rounded-xl px-3 py-2 text-sm transition border",
                  forecastPlan.kind === "pay30"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                Klarna: Pay in 30 days
              </button>

              <button
                type="button"
                onClick={() =>
                  setForecastPlan({ kind: "repeat_monthly", monthsAhead: 12 })
                }
                className={[
                  "rounded-xl px-3 py-2 text-sm transition border",
                  forecastPlan.kind === "repeat_monthly"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                Repeat monthly
              </button>

              <button
                type="button"
                onClick={() => setForecastPlan({ kind: "none" })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Clear forecast
              </button>

              <a
                href="/forecast"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Open forecast →
              </a>
            </div>

            {preview && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {preview}
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500">
              “Repeat monthly” starts next month to avoid double-counting this
              transaction’s month.
            </p>
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

"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { upsertForecastRule } from "./actions";

type Rule = {
  id: string;
  name: string;
  amount: number;
  type: string;
  start_date: string;
  end_date?: string | null;
  installments_count?: number | null;
};

const labelCls = "block text-xs font-mono text-ink-soft mb-1";
const inputCls =
  "h-9 w-full border-2 border-ink bg-white px-3 text-sm text-ink font-mono " +
  "placeholder:text-ink/30 focus:outline-none focus:border-ink/70 transition-none";
const selectCls =
  "h-9 w-full border-2 border-ink bg-white px-3 text-sm text-ink font-mono " +
  "focus:outline-none focus:border-ink/70 transition-none appearance-none";

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleToEdit?: Rule | null;
  defaultMonth?: string;
}

export function RuleModal({ isOpen, onClose, ruleToEdit, defaultMonth }: RuleModalProps) {
  const defaultDate = defaultMonth
    ? `${defaultMonth}-01`
    : new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    name: "",
    amount: "",
    type: "recurring",
    start_date: defaultDate,
    end_date: "",
    installments_count: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (ruleToEdit) {
      setForm({
        name: ruleToEdit.name,
        amount: String(ruleToEdit.amount),
        type: ruleToEdit.type,
        start_date: ruleToEdit.start_date?.slice(0, 10) ?? defaultDate,
        end_date: ruleToEdit.end_date?.slice(0, 10) ?? "",
        installments_count: ruleToEdit.installments_count != null ? String(ruleToEdit.installments_count) : "",
      });
    } else {
      setForm({
        name: "",
        amount: "",
        type: "recurring",
        start_date: defaultDate,
        end_date: "",
        installments_count: "",
      });
    }
  }, [isOpen, ruleToEdit?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await upsertForecastRule({
        id: ruleToEdit?.id,
        name: form.name,
        amount: parseFloat(form.amount),
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        installments_count:
          form.type === "installment" && form.installments_count
            ? parseInt(form.installments_count)
            : null,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border-2 border-ink w-full max-w-md overflow-hidden shadow-[4px_4px_0_#1F1F1F]">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-ink/10 bg-ink/[0.02]">
          <h2 className="font-pixel text-sm text-ink">
            {ruleToEdit ? "edit rule" : "new rule"}
          </h2>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center text-ink/35 hover:bg-cream-soft hover:text-ink transition-none"
          >
            <X size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>name</label>
            <input
              required
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Rent"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>amount (€)</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.amount}
                onChange={set("amount")}
                placeholder="-1074.00"
                className={`${inputCls} text-right`}
              />
            </div>
            <div>
              <label className={labelCls}>type</label>
              <select value={form.type} onChange={set("type")} className={selectCls}>
                <option value="income">income</option>
                <option value="recurring">fixed / recurring</option>
                <option value="installment">installment</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>start date</label>
              <input
                required
                type="date"
                value={form.start_date}
                onChange={set("start_date")}
                className={inputCls}
              />
            </div>
            {form.type === "installment" ? (
              <div>
                <label className={labelCls}>total installments</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.installments_count}
                  onChange={set("installments_count")}
                  placeholder="3"
                  className={inputCls}
                />
              </div>
            ) : (
              <div>
                <label className={labelCls}>end date (optional)</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={set("end_date")}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 border-2 border-ink bg-surface text-ink font-mono text-xs shadow-[2px_2px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1F1F1F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-8 px-3 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-none disabled:opacity-50"
            >
              {isLoading ? "saving…" : ruleToEdit ? "save changes" : "add rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

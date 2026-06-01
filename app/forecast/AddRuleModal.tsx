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
  "h-9 w-full border-2 border-ink bg-cream-soft px-3 font-mono text-xs text-ink placeholder:text-ink/30 focus:outline-none focus:bg-lime/10 transition-none";
const labelCls =
  "block font-pixel text-[9px] text-ink-soft uppercase tracking-widest mb-1.5";
const selectCls =
  "h-9 w-full border-2 border-ink bg-cream-soft px-3 font-mono text-xs text-ink focus:outline-none focus:bg-lime/10 transition-none appearance-none";

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
  const [open, setOpen]           = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType]           = useState(editRule?.type ?? "recurring");

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const triggerEl = trigger ?? (
    <button
      className="pixel-box bg-lime h-8 px-3 font-mono text-xs text-ink flex items-center gap-1.5
                 hover:bg-lime/80 transition-none
                 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
    >
      <Plus className="w-3.5 h-3.5" />
      add rule
    </button>
  );

  return (
    <>
      <div onClick={() => setOpen(true)} className="contents">
        {triggerEl}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="pixel-box bg-surface w-full max-w-md overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="bg-ink px-5 py-3.5 flex items-center justify-between">
              <span className="font-pixel text-sm text-cream-soft">
                {isEdit ? "edit rule" : "new forecast rule"}
              </span>
              <button
                onClick={handleClose}
                className="size-6 flex items-center justify-center text-cream-soft/60 hover:text-cream-soft transition-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form action={onSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {isEdit && <input type="hidden" name="id" value={editRule!.id} />}

              {/* Name */}
              <div>
                <label className={labelCls}>name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. rent"
                  defaultValue={editRule?.name}
                  className={inputCls}
                />
              </div>

              {/* Amount + Start date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>amount</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    placeholder="-1074.00"
                    defaultValue={editRule?.amount}
                    className={inputCls}
                  />
                  <p className="mt-1 font-mono text-[9px] text-ink-soft">negative = expense</p>
                </div>
                <div>
                  <label className={labelCls}>start date</label>
                  <input
                    name="start_date"
                    type="date"
                    required
                    defaultValue={editRule?.start_date ?? new Date().toISOString().slice(0, 10)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Category + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>category</label>
                  <select
                    name="category"
                    required
                    defaultValue={editRule?.category}
                    className={selectCls}
                  >
                    <option value="" disabled>select…</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>type</label>
                  <select
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={selectCls}
                  >
                    <option value="recurring">recurring (monthly)</option>
                    <option value="one_off">one-off</option>
                    <option value="budget">budget cap</option>
                    <option value="installment">installment</option>
                  </select>
                </div>
              </div>

              {/* Installments count (only for installment type) */}
              {type === "installment" && (
                <div>
                  <label className={labelCls}>number of installments</label>
                  <input
                    name="installments_count"
                    type="number"
                    min="2"
                    placeholder="e.g. 12"
                    className={inputCls}
                  />
                </div>
              )}

              {/* End date (optional for recurring) */}
              {(type === "recurring" || type === "budget") && (
                <div>
                  <label className={labelCls}>end date <span className="text-ink/30">(optional)</span></label>
                  <input
                    name="end_date"
                    type="date"
                    className={inputCls}
                  />
                </div>
              )}

              {/* Account */}
              <div>
                <label className={labelCls}>account</label>
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

              {/* Type guide */}
              <div className="border-2 border-ink/10 bg-cream/60 p-3 space-y-1">
                <p className="font-pixel text-[9px] text-ink-soft uppercase tracking-widest mb-2">type guide</p>
                {[
                  ["recurring", "monthly cash flow. salary, rent, subscriptions."],
                  ["one-off", "single future event. tax payment, holiday flight."],
                  ["budget cap", "variable spending ceiling per category. groceries, takeout."],
                  ["installment", "fixed-count monthly payments. nubank purchase, klarna."],
                ].map(([t, desc]) => (
                  <div key={t} className="flex gap-2 items-start">
                    <span className="font-mono text-[9px] text-ink bg-cream-soft border border-ink/20 px-1 shrink-0 mt-px">
                      {t}
                    </span>
                    <span className="font-sans text-[10px] text-ink-soft">{desc}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="pixel-box bg-surface h-8 px-4 font-mono text-xs text-ink
                             hover:bg-cream transition-none
                             active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="pixel-box bg-ink h-8 px-4 font-mono text-xs text-cream-soft
                             hover:bg-ink/80 transition-none disabled:opacity-50
                             active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]
                             flex items-center gap-1.5"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? "save changes" : "create rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

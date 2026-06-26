"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Transaction } from "@/lib/adapters/types";
import { updateTransactionRecord, createTransferCounterpart, setTransactionTag } from "./actions";

interface EditModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  accounts: { id: string; name: string }[];
  allTags?: string[];
}

// ── Design-system tokens ───────────────────────────────────────────────────────
const labelCls = "block text-xs font-mono text-ink-soft mb-1";
const inputCls =
  "h-9 w-full rounded-md border-2 border-ink bg-white px-3 text-sm text-ink " +
  "placeholder:text-ink/30 focus:outline-none focus:border-ink/70 transition-none";

export function EditModal({
  transaction,
  isOpen,
  onClose,
  categories,
  accounts,
  allTags = [],
}: EditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferAccountId, setTransferAccountId] = useState("");

  const [form, setForm] = useState({
    date: "",
    amount: "",
    amountEur: "",
    description: "",
    category: "Uncategorized",
    tag: "",
  });

  useEffect(() => {
    if (!transaction) return;
    setForm({
      date: transaction.date?.split("T")[0] ?? "",
      amount: String(transaction.amount ?? ""),
      amountEur: String((transaction as any).amount_eur ?? ""),
      description: transaction.description ?? "",
      category: (transaction.category ?? "").trim() || "Uncategorized",
      tag: (transaction as any).tag ?? "",
    });
    setTransferAccountId("");
    setTransferError(null);
    setIsLoading(false);
  }, [transaction?.id, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTransferError(null);
    try {
      const isNonEur = (transaction.original_currency ?? "EUR") !== "EUR";
      const newAmount = Number(form.amount);
      let newAmountEur: number | null;

      if (isNonEur) {
        // Non-EUR: use the explicit EUR field the user can edit
        const parsed = parseFloat(form.amountEur);
        newAmountEur = Number.isNaN(parsed) ? null : parsed;
      } else {
        newAmountEur = newAmount;
      }

      await updateTransactionRecord(
        transaction.id,
        {
          account_id: (transaction as any).account_id ?? transaction.accountId,
          description: form.description,
          category: form.category,
          amount: newAmount,
          amount_eur: newAmountEur,
          date: form.date,
        },
      );
      await setTransactionTag(transaction.id, form.tag.trim() || null);
      if (transferAccountId) {
        await createTransferCounterpart(transaction.id, transferAccountId);
      }
      onClose();
    } catch (err: any) {
      if (transferAccountId && err?.message) setTransferError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border-2 border-ink rounded-md shadow-[2px_2px_0_rgba(31,31,31,0.12)] w-full max-w-md overflow-hidden animate-slide-up">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10 bg-ink/[0.02]">
          <h2 className="font-pixel text-sm text-ink">edit transaction</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 place-items-center rounded-md text-ink/35 hover:bg-cream-soft hover:text-ink transition-none"
          >
            <X size={13} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">

          {/* date + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={`${inputCls} text-right pr-10`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink/35 pointer-events-none">
                  {transaction.original_currency}
                </span>
              </div>
            </div>
          </div>

          {/* EUR equivalent — only shown for non-EUR transactions */}
          {(transaction.original_currency ?? "EUR") !== "EUR" && (
            <div>
              <label className={labelCls}>eur equivalent</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={form.amountEur}
                  onChange={(e) => setForm((f) => ({ ...f, amountEur: e.target.value }))}
                  className={`${inputCls} text-right pr-10`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink/35 pointer-events-none">
                  EUR
                </span>
              </div>
            </div>
          )}

          {/* description */}
          <div>
            <label className={labelCls}>description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* category */}
          <div>
            <label className={labelCls}>category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputCls}
            >
              <option value="Uncategorized">Uncategorized</option>
              {categories
                .filter((c) => c && c !== "Uncategorized")
                .map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* tag */}
          <div>
            <label className={labelCls}>tag</label>
            <datalist id="edit-tags-list">
              {allTags.map((t) => <option key={t} value={t} />)}
            </datalist>
            <input
              list="edit-tags-list"
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
              placeholder="e.g. brazil trip 2025"
              className={inputCls}
            />
          </div>

          {/* transfer */}
          <div>
            <label className={labelCls}>transfer counterpart</label>
            <select
              value={transferAccountId}
              onChange={(e) => { setTransferAccountId(e.target.value); setTransferError(null); }}
              className={inputCls}
            >
              <option value="">no transfer counterpart</option>
              {accounts
                .filter((a) => a.id !== (transaction as any).account_id)
                .map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {transferAccountId && (
              <p className="mt-1.5 font-mono text-xs text-ink-soft italic">
                Creates a mirrored transaction ({Number(form.amount) > 0 ? "−" : "+"}
                {Math.abs(Number(form.amount)).toFixed(2)}) in the selected account.
              </p>
            )}
            {transferError && (
              <p className="mt-1.5 text-xs text-rose-600">{transferError}</p>
            )}
          </div>

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

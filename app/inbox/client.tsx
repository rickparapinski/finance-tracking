"use client";

import { useState, useTransition } from "react";
import { Check, X, Trash2, CreditCard } from "lucide-react";
import { confirmStaged, dismissStaged, dismissAll } from "./actions";

interface Staged {
  id: string;
  raw_text: string;
  merchant: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StagedCard({
  item,
  accounts,
  categories,
}: {
  item: Staged;
  accounts: { id: string; name: string }[];
  categories: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? "",
    description: item.merchant ?? item.raw_text,
    amount: String(Math.abs(item.amount ?? 0)),
    date: new Date().toISOString().slice(0, 10),
    category: "Uncategorized",
  });

  const handleConfirm = () => {
    startTransition(async () => {
      await confirmStaged(item.id, {
        accountId: form.accountId,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        category: form.category,
      });
    });
  };

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissStaged(item.id);
    });
  };

  const inputCls =
    "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition";
  const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1";

  return (
    <div className={`rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] overflow-hidden transition-opacity ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Card header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {item.merchant ?? "Unknown merchant"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {item.raw_text} · {timeAgo(item.created_at)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {item.amount != null ? (
            <span className="text-sm font-bold font-mono tabular-nums text-rose-600">
              -{new Intl.NumberFormat("de-DE", { style: "currency", currency: item.currency || "EUR" }).format(item.amount)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">parse error</span>
          )}
        </div>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="px-5 pb-4 pt-1 border-t border-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Account</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                className={inputCls}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Amount (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputCls}
            >
              <option value="Uncategorized">Uncategorized</option>
              {categories.filter((c) => c !== "Uncategorized").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-50 bg-slate-50/60">
        <button
          onClick={handleDismiss}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
        >
          <X className="w-3.5 h-3.5" /> Dismiss
        </button>
        <div className="flex items-center gap-2">
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
            >
              Edit
            </button>
          )}
          <button
            onClick={expanded ? handleConfirm : () => setExpanded(true)}
            disabled={expanded && !form.accountId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition"
          >
            <Check className="w-3.5 h-3.5" />
            {expanded ? "Add transaction" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InboxClient({
  items,
  accounts,
  categories,
}: {
  items: Staged[];
  accounts: { id: string; name: string }[];
  categories: string[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleDismissAll = () => {
    startTransition(async () => {
      await dismissAll();
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius)] bg-white shadow-[var(--shadow-softer)] py-16 text-center">
        <p className="text-sm text-slate-400">No pending notifications.</p>
        <p className="text-xs text-slate-300 mt-1">
          Payments captured via Apple Wallet will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={handleDismissAll}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Dismiss all
        </button>
      </div>
      {items.map((item) => (
        <StagedCard
          key={item.id}
          item={item}
          accounts={accounts}
          categories={categories}
        />
      ))}
    </div>
  );
}

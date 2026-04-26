"use client";

import { useState } from "react";
import { deleteForecastRule } from "./actions";
import { AddRuleModal } from "./AddRuleModal";
import { Trash2, Settings2, Loader2, Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/finance-utils";

export function ManageRulesModal({
  rules,
  categories,
  accounts,
}: {
  rules: any[];
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule? Future projections will be removed.")) return;
    setDeletingId(id);
    try {
      await deleteForecastRule(id);
    } finally {
      setDeletingId(null);
    }
  };

  const groups = [
    { title: "Recurring", items: rules.filter((r) => r.type === "recurring") },
    { title: "Budgets", items: rules.filter((r) => r.type === "budget") },
    { title: "One-off / Installments", items: rules.filter((r) => r.type !== "budget" && r.type !== "recurring") },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        <Settings2 className="w-4 h-4" />
        Manage Rules
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-semibold text-slate-900">Manage Forecast Rules</h2>
              <button
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              {rules.length === 0 && (
                <div className="text-center text-slate-400 py-8 text-sm">No active rules found.</div>
              )}

              {groups.map(({ title, items }) => {
                if (items.length === 0) return null;
                return (
                  <div key={title}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
                    <div className="space-y-1">
                      {items.map((rule: any) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{rule.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {rule.category} · {formatCurrency(rule.amount)} · from {rule.start_date?.slice(0, 10)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-3">
                            <AddRuleModal
                              categories={categories}
                              accounts={accounts}
                              editRule={{
                                id: rule.id,
                                name: rule.name,
                                amount: rule.amount,
                                type: rule.type,
                                category: rule.category,
                                account_id: rule.account_id,
                                start_date: rule.start_date?.slice(0, 10),
                              }}
                              trigger={
                                <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              }
                            />
                            <button
                              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
                              onClick={() => handleDelete(rule.id)}
                              disabled={deletingId === rule.id}
                            >
                              {deletingId === rule.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

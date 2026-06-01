"use client";

import { useState } from "react";
import { deleteForecastRule } from "./actions";
import { AddRuleModal } from "./AddRuleModal";
import { Settings2, Trash2, Pencil, Loader2, X } from "lucide-react";
import { formatCurrency } from "@/lib/finance-utils";
import { NahBubble } from "@/components/ui/nah-bubble";
import { createPortal } from "react-dom";

const TYPE_LABELS: Record<string, string> = {
  recurring:   "recurring",
  budget:      "budget cap",
  one_off:     "one-off",
  installment: "installment",
};

export function ManageRulesModal({
  rules,
  categories,
  accounts,
}: {
  rules: any[];
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
}) {
  const [open, setOpen]                       = useState(false);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteForecastRule(id);
    } finally {
      setDeletingId(null);
    }
  };

  const groups = [
    { title: "recurring",             items: rules.filter((r) => r.type === "recurring") },
    { title: "budget caps",           items: rules.filter((r) => r.type === "budget") },
    { title: "one-off / installment", items: rules.filter((r) => r.type !== "budget" && r.type !== "recurring") },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pixel-box bg-surface h-8 px-3 font-mono text-xs text-ink flex items-center gap-1.5
                   hover:bg-cream transition-none
                   active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
      >
        <Settings2 className="w-3.5 h-3.5" />
        manage
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="pixel-box bg-surface w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="bg-ink px-5 py-3.5 flex items-center justify-between shrink-0">
              <span className="font-pixel text-sm text-cream-soft">manage forecast rules</span>
              <button
                onClick={() => setOpen(false)}
                className="size-6 flex items-center justify-center text-cream-soft/60 hover:text-cream-soft transition-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-6 flex-1">
              {rules.length === 0 && (
                <div className="text-center font-mono text-xs text-ink/30 py-10">
                  no active rules yet.
                </div>
              )}

              {groups.map(({ title, items }) => {
                if (items.length === 0) return null;
                return (
                  <div key={title}>
                    <div className="font-pixel text-[10px] text-ink-soft uppercase tracking-widest mb-3">
                      {title}
                    </div>
                    <div className="pixel-box bg-surface overflow-hidden divide-y divide-ink/10">
                      {items.map((rule: any) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-cream/60 transition-none"
                        >
                          <div className="min-w-0">
                            <div className="font-sans text-sm text-ink font-medium truncate">
                              {rule.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-ink-soft">
                                {rule.category}
                              </span>
                              <span className="font-mono text-[10px] text-ink-soft">·</span>
                              <span className="font-mono text-[10px] text-ink font-bold">
                                {formatCurrency(rule.amount)}
                              </span>
                              <span className="font-mono text-[10px] text-ink-soft">·</span>
                              <span className="font-mono text-[9px] bg-cream border border-ink/20 px-1 text-ink-soft">
                                {TYPE_LABELS[rule.type] ?? rule.type}
                              </span>
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
                                <button className="size-7 flex items-center justify-center border-2 border-ink/0 text-ink-soft hover:border-ink hover:text-ink hover:bg-lime/20 transition-none">
                                  <Pencil className="h-3 w-3" />
                                </button>
                              }
                            />
                            <button
                              className="size-7 flex items-center justify-center border-2 border-ink/0 text-ink-soft hover:border-ink hover:text-ink hover:bg-cream transition-none disabled:opacity-30"
                              onClick={() => setConfirmDeleteId(rule.id)}
                              disabled={deletingId === rule.id}
                            >
                              {deletingId === rule.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Trash2 className="h-3 w-3" />}
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

      {/* Delete confirmation — portal so it escapes any transform container */}
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4">
          <div className="pixel-box bg-surface p-6 max-w-sm w-full space-y-5 animate-slide-up">
            <NahBubble expression="skeptical" nahSize={48} layout="side">
              delete this rule?<br />future projections will be removed.
            </NahBubble>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="pixel-box bg-surface h-8 px-3 font-mono text-xs text-ink
                           hover:bg-cream transition-none
                           active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F]"
              >
                cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="pixel-box bg-ink h-8 px-3 font-mono text-xs text-cream-soft
                           hover:bg-ink/80 transition-none
                           active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                delete
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

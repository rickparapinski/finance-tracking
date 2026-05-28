"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRef as useFormRef, useState } from "react";
import { X } from "lucide-react";
import { createRule, updateRule, deleteRule, countMatchingUncategorized } from "./rules/actions";

type Rule = {
  id: string;
  pattern: string;
  priority: number;
  is_active: boolean;
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const inputCls =
  "h-9 w-full rounded-md border-2 border-ink bg-white px-3 text-sm text-ink " +
  "placeholder:text-ink/30 focus:outline-none focus:border-ink/70 transition-none";
const labelCls = "block text-xs font-mono text-ink-soft mb-1";

// ── Confirm dialog for "apply to existing?" ───────────────────────────────────
function ApplyDialog({
  dialog,
  onConfirm,
  onSkip,
  onClose,
}: {
  dialog: { pattern: string; count: number; priority: string };
  onConfirm: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border-2 border-ink rounded-md shadow-[2px_2px_0_rgba(31,31,31,0.12)] w-full max-w-sm overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10 bg-ink/[0.02]">
          <h2 className="font-pixel text-sm text-ink">apply to existing?</h2>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-ink/35 hover:bg-cream-soft hover:text-ink transition-none"
          >
            <X size={13} />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="font-mono text-sm text-ink">
            {dialog.count === 0 ? (
              <>
                no uncategorized transactions match{" "}
                <span className="font-mono font-medium">"{dialog.pattern}"</span>.
              </>
            ) : (
              <>
                <span className="font-medium">{dialog.count}</span> uncategorized
                transaction{dialog.count !== 1 ? "s" : ""} match{" "}
                <span className="font-medium">"{dialog.pattern}"</span>. categorize
                them now?
              </>
            )}
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            onClick={onSkip}
            className="bg-surface border-2 border-ink text-ink font-mono text-sm rounded-md px-4 py-2 hover:bg-cream-soft transition-none"
          >
            skip
          </button>
          {dialog.count > 0 && (
            <button
              onClick={onConfirm}
              className="bg-[#C5F03A] border-2 border-ink text-ink font-mono text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-none"
            >
              apply to {dialog.count}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main RulesPanel ───────────────────────────────────────────────────────────
export function RulesPanel({
  isOpen,
  onClose,
  rules: initialRules,
  categoryId,
}: {
  isOpen: boolean;
  onClose: () => void;
  rules: Rule[];
  categoryId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ pattern: string; count: number; priority: string } | null>(null);

  // Escape key closes panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Add rule form submit ──
  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const pattern = String(data.get("pattern") || "").trim();
    const priority = String(data.get("priority") || "100");
    if (!pattern) return;
    const count = await countMatchingUncategorized(pattern);
    setDialog({ pattern, count, priority });
  }

  function submitCreate(applyExisting: boolean) {
    if (!dialog) return;
    const d = dialog;
    setDialog(null);
    const data = new FormData();
    data.set("category_id", categoryId);
    data.set("pattern", d.pattern);
    data.set("priority", d.priority);
    if (applyExisting) data.set("apply_existing", "on");
    startTransition(async () => {
      await createRule(data);
      formRef.current?.reset();
    });
  }

  return (
    <>
      {dialog && (
        <ApplyDialog
          dialog={dialog}
          onConfirm={() => submitCreate(true)}
          onSkip={() => submitCreate(false)}
          onClose={() => setDialog(null)}
        />
      )}

      <div className="bg-surface border-2 border-ink rounded-md p-4 space-y-4 animate-reveal-down">
        <p className={labelCls}>auto-categorization rules</p>

        {/* ── Add form ── */}
        <form ref={formRef} onSubmit={handleAddSubmit} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="category_id" value={categoryId} />
          <div className="flex-1 min-w-[180px]">
            <label className={labelCls}>keyword (contains)</label>
            <input name="pattern" placeholder="e.g. wolt" required className={inputCls} />
          </div>
          <div className="w-24">
            <label className={labelCls}>priority</label>
            <input name="priority" type="number" defaultValue={100} className={inputCls} />
          </div>
          <button
            disabled={pending}
            className="h-9 px-4 bg-[#C5F03A] border-2 border-ink text-ink font-mono text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-none self-end"
          >
            {pending ? "saving…" : "add"}
          </button>
        </form>

        {/* ── Existing rules ── */}
        {initialRules.length > 0 && (
          <div className="divide-y divide-ink/10">
            {initialRules.map((r) => (
              <form key={r.id} action={updateRule} className="py-2 flex flex-wrap gap-x-3 gap-y-2 items-center">
                <input type="hidden" name="category_id" value={categoryId} />
                <input type="hidden" name="id" value={r.id} />
                {/* pattern */}
                <input
                  name="pattern"
                  defaultValue={r.pattern}
                  className="flex-1 min-w-[140px] h-8 rounded-md border border-ink/20 bg-white px-2 text-sm font-mono text-ink focus:outline-none focus:border-ink/70 transition-none"
                />
                {/* priority */}
                <input
                  name="priority"
                  type="number"
                  defaultValue={r.priority}
                  className="w-20 h-8 rounded-md border border-ink/20 bg-white px-2 text-xs font-mono text-ink-soft text-right focus:outline-none focus:border-ink/70 transition-none"
                />
                {/* active toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    name="is_active"
                    type="checkbox"
                    defaultChecked={r.is_active}
                    className="rounded border-ink h-3.5 w-3.5"
                  />
                  <span className="font-mono text-xs text-ink-soft">active</span>
                </label>
                {/* actions */}
                <div className="flex gap-3 ml-auto">
                  <button type="submit" className="font-mono text-xs text-ink hover:underline transition-none">
                    save
                  </button>
                  <button
                    formAction={deleteRule}
                    type="submit"
                    className="font-mono text-xs text-ink-soft hover:underline transition-none"
                  >
                    delete
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}

        {initialRules.length === 0 && (
          <p className="font-mono text-xs text-ink-soft italic">no rules yet — add one above.</p>
        )}

        <p className="font-mono text-xs text-ink-soft italic">
          lower priority wins. e.g. <span className="not-italic font-mono">wolt</span>,{" "}
          <span className="not-italic font-mono">lieferando</span> → eating out.
        </p>
      </div>
    </>
  );
}

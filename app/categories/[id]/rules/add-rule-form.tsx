"use client";

import { useRef, useState, useTransition } from "react";
import { createRule, countMatchingUncategorized } from "./actions";
import { X } from "lucide-react";

export function AddRuleForm({ categoryId }: { categoryId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ pattern: string; count: number; priority: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const pattern = String(data.get("pattern") || "").trim();
    const priority = String(data.get("priority") || "100");

    if (!pattern) return;

    const count = await countMatchingUncategorized(pattern);
    setDialog({ pattern, count, priority });
  }

  function submit(applyExisting: boolean) {
    if (!dialog) return;
    setDialog(null);
    const data = new FormData();
    data.set("category_id", categoryId);
    data.set("pattern", dialog.pattern);
    data.set("priority", dialog.priority);
    if (applyExisting) data.set("apply_existing", "on");

    startTransition(async () => {
      await createRule(data);
      formRef.current?.reset();
    });
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="category_id" value={categoryId} />
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Keyword (contains)
          </label>
          <input
            name="pattern"
            placeholder="e.g. wolt"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            required
          />
        </div>

        <div className="w-32">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Priority
          </label>
          <input
            name="priority"
            type="number"
            defaultValue={100}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <button
          disabled={pending}
          className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-white shadow-[var(--shadow-softer)] hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add"}
        </button>
      </form>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[var(--radius)] shadow-[var(--shadow-soft)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Apply to existing?</h2>
              <button
                onClick={() => setDialog(null)}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600">
                {dialog.count === 0 ? (
                  <>No uncategorized transactions match <span className="font-mono font-semibold text-slate-800">{dialog.pattern}</span>.</>
                ) : (
                  <>Found <span className="font-semibold text-slate-900">{dialog.count}</span> uncategorized transaction{dialog.count !== 1 ? "s" : ""} matching <span className="font-mono font-semibold text-slate-800">{dialog.pattern}</span>. Categorize them now?</>
                )}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                onClick={() => submit(false)}
                className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Skip
              </button>
              {dialog.count > 0 && (
                <button
                  onClick={() => submit(true)}
                  className="h-9 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 transition"
                >
                  Apply to {dialog.count}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

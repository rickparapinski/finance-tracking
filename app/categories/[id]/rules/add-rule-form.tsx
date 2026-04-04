"use client";

import { useRef, useState, useTransition } from "react";
import { createRule, countMatchingUncategorized } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply rule to existing transactions?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {dialog?.count === 0 ? (
              <>No uncategorized transactions match <span className="font-mono font-semibold">{dialog.pattern}</span>.</>
            ) : (
              <>Found <span className="font-semibold">{dialog?.count}</span> uncategorized transaction{dialog?.count !== 1 ? "s" : ""} matching <span className="font-mono font-semibold">{dialog?.pattern}</span>. Categorize them now?</>
            )}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => submit(false)}>
              Skip
            </Button>
            {(dialog?.count ?? 0) > 0 && (
              <Button onClick={() => submit(true)}>
                Apply to {dialog?.count}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

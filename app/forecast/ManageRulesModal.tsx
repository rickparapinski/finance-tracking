"use client";

import { useState } from "react";
import { deleteForecastRule } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Settings2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/finance-utils";

export function ManageRulesModal({ rules }: { rules: any[] }) {
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule? Future projections will be removed."))
      return;
    setDeletingId(id);
    try {
      await deleteForecastRule(id);
    } finally {
      setDeletingId(null);
    }
  };

  const budgets = rules.filter((r) => r.type === "budget");
  const recurring = rules.filter((r) => r.type === "recurring");
  const others = rules.filter(
    (r) => r.type !== "budget" && r.type !== "recurring",
  );

  const RuleList = ({
    title,
    items,
  }: {
    title: string;
    items: typeof rules;
  }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2 mb-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </h3>
        <div className="space-y-1">
          {items.map((rule: any) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition"
            >
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {rule.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {rule.category} • {formatCurrency(rule.amount)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                onClick={() => handleDelete(rule.id)}
                disabled={deletingId === rule.id}
              >
                {deletingId === rule.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Settings2 className="w-4 h-4 mr-2" />
          Manage Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Forecast Rules</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <RuleList title="Budgets" items={budgets} />
          <RuleList title="Recurring" items={recurring} />
          <RuleList title="One-off / Installments" items={others} />

          {rules.length === 0 && (
            <div className="text-center text-slate-400 py-8 text-sm">
              No active rules found.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

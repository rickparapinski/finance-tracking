"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Nah, type NahExpression } from "@/components/Nah";
import { QuickAddForm } from "@/components/quick-add-form";

interface TransactionsTopProps {
  accounts: { id: string; name: string; currency: string }[];
  categories: string[];
  totalCount: number;
  /** Days since the last logged transaction — drives voice + Nah expression */
  daysSinceLastLog?: number;
}

/** State-aware header voice + Nah expression — mirrors sidebar escalation */
function headerState(days: number): { expression: NahExpression; subtitle: string } {
  if (days <= 1) return { expression: "approving",   subtitle: "logged. noted." };
  if (days <= 4) return { expression: "skeptical",   subtitle: "logged. but where've you been?" };
  return             { expression: "disappointed", subtitle: "logged. ...nah." };
}

// Duration must match animate-reveal-up in globals.css (200ms)
const CLOSE_DURATION = 200;

export function TransactionsTop({
  accounts,
  categories,
  totalCount,
  daysSinceLastLog = 0,
}: TransactionsTopProps) {
  const [open, setOpen]       = useState(false);
  const [closing, setClosing] = useState(false);
  const { expression, subtitle } = headerState(daysSinceLastLog);

  /** Play exit animation, then unmount. */
  const doClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_DURATION);
  };

  const toggle = () => {
    if (open) doClose();
    else      setOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <header className="flex items-start gap-3">
        <div className="nah-idle shrink-0 mt-0.5">
          <Nah expression={expression} size={32} />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-pixel text-xl text-ink leading-none">transactions</h1>
          <p className="font-sans text-[11px] text-ink/40 mt-1 leading-none">
            {totalCount} {subtitle}
          </p>
        </div>

        <button
          onClick={toggle}
          className={
            open
              ? "self-center flex items-center gap-1.5 h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-[11px] rounded-md hover:bg-cream-soft transition-none shrink-0"
              : "self-center flex items-center gap-1.5 h-8 px-3 bg-lime border-2 border-ink text-ink font-pixel text-[11px] rounded-md shadow-[2px_2px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1F1F1F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none shrink-0"
          }
        >
          {open ? <X size={11} className="shrink-0" /> : <Plus size={11} className="shrink-0" />}
          {open ? "cancel" : "log a transaction"}
        </button>
      </header>

      {/* ── Collapsible form — stays mounted during exit animation ── */}
      {open && (
        <div
          className={`bg-surface border-2 border-ink rounded-md shadow-[2px_2px_0_rgba(31,31,31,0.09)] overflow-hidden ${
            closing ? "animate-reveal-up" : "animate-reveal-down"
          }`}
        >
          <div className="flex items-center px-4 py-2 border-b-2 border-ink/10 bg-ink/[0.02]">
            <span className="font-mono text-xs text-ink-soft">new transaction</span>
          </div>
          <div className="p-4">
            <QuickAddForm
              accounts={accounts}
              categories={categories}
              onSuccess={doClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}

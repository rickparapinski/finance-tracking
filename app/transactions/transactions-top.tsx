"use client";

import { useState } from "react";
import { Close } from "pixelarticons/react/Close";
import { Nah, type NahExpression } from "@/components/Nah";
import { PageHeader } from "@/components/layout/page-header";
import { QuickAddForm } from "@/components/quick-add-form";

interface TransactionsTopProps {
  accounts: { id: string; name: string; currency: string }[];
  categories: string[];
  totalCount: number;
  daysSinceLastLog?: number;
}

function headerState(days: number): { expression: NahExpression; subtitle: string } {
  if (days <= 1) return { expression: "approving",    subtitle: "logged. noted." };
  if (days <= 4) return { expression: "skeptical",    subtitle: "logged. but where've you been?" };
  return              { expression: "disappointed",   subtitle: "logged. ...nah." };
}

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

  const doClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, CLOSE_DURATION);
  };

  const toggle = () => { if (open) doClose(); else setOpen(true); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="transactions"
        icon={<div className="nah-idle"><Nah expression={expression} size={32} /></div>}
        meta={`${totalCount} ${subtitle}`}
        action={
          <button
            onClick={toggle}
            className={
              open
                ? "flex items-center gap-1.5 h-8 px-3 bg-surface border-2 border-ink text-ink font-mono text-[11px] shadow-[2px_2px_0_#1F1F1F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none shrink-0"
                : "flex items-center gap-1.5 h-8 px-3 bg-lime border-2 border-ink text-ink font-pixel text-[11px] shadow-[4px_4px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1F1F1F] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-none shrink-0"
            }
          >
            {open
              ? <><Close className="size-[11px] shrink-0" />cancel</>
              : <>+ log a transaction</>
            }
          </button>
        }
      />

      {/* Collapsible quick-add form */}
      {open && (
        <div
          className={`bg-surface border-2 border-ink shadow-[4px_4px_0_#1F1F1F] overflow-hidden ${
            closing ? "animate-reveal-up" : "animate-reveal-down"
          }`}
        >
          <div className="flex items-center px-4 py-2 border-b-2 border-ink/10 bg-ink/[0.02]">
            <span className="font-pixel text-xs text-ink-soft">new transaction</span>
          </div>
          <div className="p-4">
            <QuickAddForm
              accounts={accounts}
              categories={categories}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — one shared skeleton for every page.
 *
 * Slot A (identity, left):  icon/mascot + title + one metadata line
 * Slot B (actions, right):  primary action (one button max per spec)
 * Slot C (context bar):     full-width strip below the A/B row —
 *                           cycle nav, search, filter tabs, bulk edit
 *
 * Fill only the slots your page needs. Positions never move.
 *
 * Usage:
 *   <PageHeader
 *     title="transactions"
 *     icon={<Nah expression="approving" size={32} />}
 *     meta="1,234 logged."
 *     action={<Button>log a transaction</Button>}
 *     contextBar={<CycleNavigator ... />}
 *   />
 */

interface PageHeaderProps {
  /** Page title — always font-pixel, sentence/lowercase */
  title: string;
  /** Optional icon or mascot to the left of the title */
  icon?: React.ReactNode;
  /** One line of metadata below the title (font-mono, ink-soft) */
  meta?: React.ReactNode;
  /** Top-right slot — the page's single primary action */
  action?: React.ReactNode;
  /** Full-width strip rendered below the title row — cycle nav, search, filters */
  contextBar?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  icon,
  meta,
  action,
  contextBar,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {/* Row: Slot A (identity) + Slot B (action) */}
      <div className="flex items-start justify-between gap-4">
        {/* Slot A */}
        <div className="flex items-center gap-3 min-w-0">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h1 className="font-pixel text-xl text-ink leading-none lowercase truncate">
              {title}
            </h1>
            {meta && (
              <p className="font-mono text-xs text-ink-soft mt-1 leading-none">
                {meta}
              </p>
            )}
          </div>
        </div>

        {/* Slot B */}
        {action && (
          <div className="shrink-0 self-center">{action}</div>
        )}
      </div>

      {/* Slot C — context bar (only rendered when provided) */}
      {contextBar && (
        <div className="flex items-center flex-wrap gap-2">
          {contextBar}
        </div>
      )}
    </header>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "pixelarticons/react/ChevronLeft";

/**
 * PageHeader — one shared skeleton for every page.
 *
 * Slot A (identity, left):  [back btn?] + icon/mascot + title + one metadata line
 * Slot B (actions, right):  primary action (one per spec)
 * Slot C (context bar):     full-width strip below the A/B row
 *                           Use contextBarBoxed to render it as a pixel-box card strip.
 *
 * Usage:
 *   <PageHeader
 *     back="/categories"
 *     title="shopping"
 *     icon={<CategoryIcon ... />}
 *     meta="expense · 319,67 €"
 *     action={<Button>edit</Button>}
 *     contextBar={<CycleNavigator ... />}
 *     contextBarBoxed
 *   />
 */

// Shared icon-button style — same visual as eye/bell/cycle-arrow chrome buttons
export const iconBtnCls =
  "size-8 grid place-items-center border-2 border-ink bg-surface text-ink-soft " +
  "shadow-[2px_2px_0_#1F1F1F] hover:bg-lime hover:text-ink " +
  "hover:shadow-[1px_1px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] " +
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none " +
  "cursor-pointer transition-none shrink-0";

interface PageHeaderProps {
  title: string;
  /** href for the back button — renders a square pixel icon-button left of the icon */
  back?: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  /** Top-right slot — single primary action */
  action?: React.ReactNode;
  /** Full-width strip below the title row */
  contextBar?: React.ReactNode;
  /** When true, renders contextBar inside a pixel-box card strip */
  contextBarBoxed?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  back,
  icon,
  meta,
  action,
  contextBar,
  contextBarBoxed,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {/* Row: Slot A (identity) + Slot B (action) */}
      <div className="flex items-start justify-between gap-4">
        {/* Slot A */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Back button — square icon, anchored to title row */}
          {back && (
            <Link href={back} className={iconBtnCls} title="back">
              <ChevronLeft className="size-[14px]" />
            </Link>
          )}
          <div className="flex items-center gap-2 min-w-0">
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
        </div>

        {/* Slot B */}
        {action && <div className="shrink-0 self-center">{action}</div>}
      </div>

      {/* Slot C — context bar */}
      {contextBar && (
        contextBarBoxed ? (
          <div className="bg-surface border-2 border-ink shadow-[4px_4px_0_#1F1F1F] px-4 py-2.5 flex items-center flex-wrap gap-2">
            {contextBar}
          </div>
        ) : (
          <div className="flex items-center flex-wrap gap-2">
            {contextBar}
          </div>
        )
      )}
    </header>
  );
}

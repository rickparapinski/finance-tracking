"use client";

import { useState } from "react";
import { ChevronDown } from "pixelarticons/react/ChevronDown";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type Period, fmtPeriodLabel } from "@/lib/periods";

interface CycleSwitcherProps {
  periods: Period[];       // index 0 = current/newest
  currentKey: string;      // the live cycle key
  selectedKey: string;
  isPending?: boolean;
  onChange: (period: Period) => void;
}

/** Short trigger label: "Apr – May 2026" for past cycles. */
function shortLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end   + "T00:00:00");
  const sm = s.toLocaleDateString("en-GB", { month: "short" });
  const em = e.toLocaleDateString("en-GB", { month: "short" });
  const ey = e.getFullYear();
  return sm === em ? `${sm} ${ey}` : `${sm} – ${em} ${ey}`;
}

export function CycleSwitcher({
  periods,
  currentKey,
  selectedKey,
  isPending = false,
  onChange,
}: CycleSwitcherProps) {
  const [open, setOpen] = useState(false);

  const selected   = periods.find((p) => p.key === selectedKey) ?? periods[0];
  const isCurrent  = selected.key === currentKey;
  const currentPeriod = periods[0]; // always index 0

  const triggerLabel = isCurrent
    ? "current cycle"
    : shortLabel(selected.start_date, selected.end_date);

  // Secondary button — surface fill, ink border, 4px shadow
  const triggerCls =
    "h-8 px-3 flex items-center gap-1.5 bg-surface border-2 border-ink text-ink " +
    "font-mono text-[11px] shadow-[4px_4px_0_#1F1F1F] " +
    "hover:bg-cream-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#1F1F1F] " +
    "transition-none " +
    (isPending ? "opacity-50 pointer-events-none" : "");

  return (
    <div className="flex items-center gap-2">
      {/* "→ current" jump link — visible when on a past cycle */}
      {!isCurrent && (
        <button
          onClick={() => onChange(currentPeriod)}
          className="font-mono text-[10px] text-ink-soft hover:text-ink transition-none underline underline-offset-2"
          title="Jump to current cycle"
        >
          → current
        </button>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={triggerCls}>
            <span>{triggerLabel}</span>
            <ChevronDown className="size-[11px] shrink-0 text-ink-soft" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={6}
          className={[
            // Pixel dialog treatment — ink border, hard offset shadow, no soft shadow, no rounded
            "w-64 p-0 border-2 border-ink bg-surface shadow-[4px_4px_0_#1F1F1F]",
            // Kill the default popover styles
            "!rounded-none !shadow-none",
          ].join(" ")}
          style={{ boxShadow: "4px 4px 0 #1F1F1F" }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-ink/10">
            <span className="font-pixel text-[10px] text-ink-soft">select cycle</span>
          </div>

          {/* Cycle list — scrollable, ~6 visible at a time */}
          <ul className="max-h-[228px] overflow-y-auto">
            {periods.map((p) => {
              const isThisCurrent  = p.key === currentKey;
              const isThisSelected = p.key === selectedKey;

              return (
                <li key={p.key}>
                  <button
                    onClick={() => { onChange(p); setOpen(false); }}
                    className={[
                      "w-full flex items-center justify-between px-3 py-2.5 text-left transition-none",
                      isThisSelected
                        ? "bg-ink/[0.04]"
                        : "hover:bg-cream",
                    ].join(" ")}
                  >
                    <span className={`font-mono text-xs ${isThisSelected ? "text-ink font-medium" : "text-ink-soft"}`}>
                      {isThisCurrent ? "current cycle" : fmtPeriodLabel(p.start_date, p.end_date)}
                    </span>

                    {/* Current cycle marker — lime dot */}
                    {isThisCurrent && (
                      <span className="size-2 rounded-full bg-lime shrink-0 border border-ink" />
                    )}

                    {/* Selected (non-current) — subtle tick */}
                    {isThisSelected && !isThisCurrent && (
                      <span className="font-pixel text-[9px] text-ink-soft">✓</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

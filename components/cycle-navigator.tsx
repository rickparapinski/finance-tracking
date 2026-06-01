"use client";

import { ChevronLeft } from "pixelarticons/react/ChevronLeft";
import { ChevronRight } from "pixelarticons/react/ChevronRight";
import { type Period, fmtPeriodLabel } from "@/lib/periods";

interface CycleNavigatorProps {
  periods: Period[];
  currentKey: string;
  selectedKey: string;
  isPending?: boolean;
  onChange: (period: Period) => void;
}

export function CycleNavigator({
  periods,
  currentKey,
  selectedKey,
  isPending = false,
  onChange,
}: CycleNavigatorProps) {
  const idx      = periods.findIndex((p) => p.key === selectedKey);
  const selected = periods[idx] ?? periods[0];
  const isCurrent = selected.key === currentKey;

  const goPrev = () => { if (idx < periods.length - 1) onChange(periods[idx + 1]); };
  const goNext = () => { if (idx > 0) onChange(periods[idx - 1]); };

  const btnCls =
    "grid size-8 place-items-center border-2 border-ink bg-surface text-ink " +
    "shadow-[2px_2px_0_#1F1F1F] hover:bg-lime hover:shadow-[1px_1px_0_#1F1F1F] " +
    "hover:translate-x-[1px] hover:translate-y-[1px] " +
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none " +
    "disabled:opacity-30 disabled:pointer-events-none transition-none";

  return (
    <div className={`flex items-center gap-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <button onClick={goPrev} disabled={idx >= periods.length - 1} title="Previous period" className={btnCls}>
        <ChevronLeft className="size-4" />
      </button>

      <div className="text-center min-w-[160px]">
        <p className="font-mono text-xs text-ink font-medium leading-tight">
          {fmtPeriodLabel(selected.start_date, selected.end_date)}
        </p>
        {isCurrent && (
          <span className="font-mono text-[10px] text-ink-soft">current</span>
        )}
      </div>

      <button onClick={goNext} disabled={idx <= 0} title="Next period" className={btnCls}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

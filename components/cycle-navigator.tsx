"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Period, fmtPeriodLabel } from "@/lib/periods";

interface CycleNavigatorProps {
  periods: Period[];          // index 0 = newest
  currentKey: string;         // the "live" cycle key
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
  const idx = periods.findIndex((p) => p.key === selectedKey);
  const selected = periods[idx] ?? periods[0];
  const isCurrent = selected.key === currentKey;

  const goPrev = () => { if (idx < periods.length - 1) onChange(periods[idx + 1]); };
  const goNext = () => { if (idx > 0) onChange(periods[idx - 1]); };

  const btnCls =
    "grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 " +
    "hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition";

  return (
    <div className={`flex items-center gap-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <button
        onClick={goPrev}
        disabled={idx >= periods.length - 1}
        title="Previous period"
        className={btnCls}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="text-center min-w-[160px]">
        <p className="text-xs font-semibold text-slate-800 leading-tight">
          {fmtPeriodLabel(selected.start_date, selected.end_date)}
        </p>
        {isCurrent && (
          <span className="text-[10px] font-medium text-indigo-500 uppercase tracking-wide">
            current
          </span>
        )}
      </div>

      <button
        onClick={goNext}
        disabled={idx <= 0}
        title="Next period"
        className={btnCls}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

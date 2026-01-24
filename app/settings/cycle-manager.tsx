"use client";

import { useState } from "react";
import {
  Loader2,
  RotateCcw,
  Save,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns"; // Make sure to install date-fns
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // From shadcn
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // From shadcn
import { upsertCycle } from "./actions";
import { getCycleStartDate } from "@/lib/finance-utils";
import { clsx } from "clsx";
import { cn } from "@/lib/utils";

// Helper to format date for input (YYYY-MM-DD) vs display (DD.MM.YYYY)
const toInputFormat = (d: Date) => d.toISOString().split("T")[0];

export function CycleManager({ existingCycles }: { existingCycles: any[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState<string | null>(null);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleSave = async (key: string, start: string, end: string) => {
    setLoading(key);
    try {
      await upsertCycle({ key, start_date: start, end_date: end });
    } finally {
      setLoading(null);
    }
  };

  const handleAutoCalculate = async (key: string, monthIndex: number) => {
    // Default logic: Start previous month 25th
    const start = getCycleStartDate(year, monthIndex - 1);
    const nextStart = getCycleStartDate(year, monthIndex);
    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);

    await handleSave(key, toInputFormat(start), toInputFormat(end));
  };

  return (
    <div className="space-y-4">
      {/* Header / Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-300 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-slate-900"
            onClick={() => setYear(year - 1)}
          >
            ←
          </Button>
          <span className="text-sm font-bold w-12 text-center text-slate-700 font-mono">
            {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-slate-900"
            onClick={() => setYear(year + 1)}
          >
            →
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-[var(--shadow-soft)]">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold w-32">Month</th>
              <th className="px-4 py-3 text-left font-semibold">Start Date</th>
              <th className="px-4 py-3 text-left font-semibold">End Date</th>
              <th className="px-4 py-3 text-right font-semibold w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map((monthIndex) => {
              const cycleKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
              const override = existingCycles.find((c) => c.key === cycleKey);

              // Calculate defaults for fallback
              const defStart = getCycleStartDate(year, monthIndex - 1);
              const defNext = getCycleStartDate(year, monthIndex);
              const defEnd = new Date(defNext);
              defEnd.setDate(defEnd.getDate() - 1);

              const activeStart = override
                ? override.start_date
                : toInputFormat(defStart);
              const activeEnd = override
                ? override.end_date
                : toInputFormat(defEnd);
              const isModified = !!override;

              return (
                <CycleRow
                  key={cycleKey}
                  label={new Date(year, monthIndex).toLocaleString("en-US", {
                    month: "long",
                  })}
                  cycleKey={cycleKey}
                  start={activeStart}
                  end={activeEnd}
                  isModified={isModified}
                  loading={loading === cycleKey}
                  onSave={handleSave}
                  onReset={() => handleAutoCalculate(cycleKey, monthIndex)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Helper Component for the Date Picker ---
function DateCell({
  value,
  onChange,
  isDirty,
  isModified,
}: {
  value: string;
  onChange: (val: string) => void;
  isDirty: boolean;
  isModified: boolean;
}) {
  const dateObj = value ? new Date(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left font-mono text-xs px-3",
            !value && "text-muted-foreground",
            isDirty
              ? "border-blue-400 bg-blue-50 text-blue-900 hover:bg-blue-100 hover:text-blue-900"
              : isModified
                ? "border-amber-200 text-amber-800 bg-white hover:bg-amber-50 hover:text-amber-900"
                : "border-slate-200 text-slate-600 bg-slate-50/50 hover:bg-slate-100",
          )}
        >
          <CalendarIcon className="mr-2 h-3 w-3 opacity-50" />
          {dateObj ? format(dateObj, "dd.MM.yyyy") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateObj}
          onSelect={(d) => d && onChange(toInputFormat(d))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function CycleRow({
  label,
  cycleKey,
  start,
  end,
  isModified,
  loading,
  onSave,
  onReset,
}: any) {
  const [s, setS] = useState(start);
  const [e, setE] = useState(end);
  const isDirty = s !== start || e !== end;

  // Sync state if props change (e.g. after reset or year change)
  if (!isDirty && s !== start) setS(start);
  if (!isDirty && e !== end) setE(end);

  return (
    <tr
      className={clsx(
        "transition-colors group",
        isModified
          ? "bg-amber-50/40 hover:bg-amber-50/60"
          : "hover:bg-slate-50",
      )}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {cycleKey}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <DateCell
          value={s}
          onChange={setS}
          isDirty={s !== start}
          isModified={isModified}
        />
      </td>

      <td className="px-4 py-3 align-middle">
        <DateCell
          value={e}
          onChange={setE}
          isDirty={e !== end}
          isModified={isModified}
        />
      </td>

      <td className="px-4 py-3 align-middle text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isModified && !isDirty && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={onReset}
              title="Reset to default calculation"
            >
              <RotateCcw size={14} />
            </Button>
          )}
          {isDirty && (
            <Button
              size="icon"
              className="h-8 w-8 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              onClick={() => onSave(cycleKey, s, e)}
              disabled={loading}
              title="Save changes"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

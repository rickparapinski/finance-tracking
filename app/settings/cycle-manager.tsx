"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  RotateCcw,
  Save,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { upsertCycle } from "./actions";
import { getCycleStartDate } from "@/lib/finance-utils";
import { clsx } from "clsx";
import { cn } from "@/lib/utils";

// Helper to format date for input (YYYY-MM-DD) keeping LOCAL time
// (toISOString() converts to UTC, which causes the "one day before" bug)
const toInputFormat = (d: Date) => format(d, "yyyy-MM-dd");

type CycleRowData = {
  key: string;
  monthLabel: string;
  start_date: string;
  end_date: string;
  isModified: boolean; // Matches DB or default?
};

export function CycleManager({ existingCycles }: { existingCycles: any[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [cycles, setCycles] = useState<CycleRowData[]>([]);

  // 1. Initialize State (Compute all 12 months with defaults + overrides)
  useEffect(() => {
    const months = Array.from({ length: 12 }, (_, i) => i);

    const computed = months.map((monthIndex) => {
      const cycleKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const override = existingCycles.find((c) => c.key === cycleKey);

      // Default Logic
      const defStart = getCycleStartDate(year, monthIndex - 1);
      const defNext = getCycleStartDate(year, monthIndex);
      const defEnd = new Date(defNext);
      defEnd.setDate(defEnd.getDate() - 1);

      const start = override ? override.start_date : toInputFormat(defStart);
      const end = override ? override.end_date : toInputFormat(defEnd);

      return {
        key: cycleKey,
        monthLabel: new Date(year, monthIndex).toLocaleString("en-US", {
          month: "long",
        }),
        start_date: start,
        end_date: end,
        isModified: !!override,
      };
    });

    setCycles(computed);
  }, [year, existingCycles]);

  // 2. Handle Changes with "Validation/Linking" Logic
  const handleDateChange = (
    index: number,
    field: "start_date" | "end_date",
    newDate: string,
  ) => {
    const newCycles = [...cycles];
    newCycles[index] = {
      ...newCycles[index],
      [field]: newDate,
      isModified: true,
    };

    // A) If End Date changes -> Update Next Start
    if (field === "end_date" && index < 11) {
      const nextIndex = index + 1;
      const nextStart = toInputFormat(addDays(parseISO(newDate), 1));

      newCycles[nextIndex] = {
        ...newCycles[nextIndex],
        start_date: nextStart,
        isModified: true, // Mark next cycle as modified too
      };
    }

    // B) If Start Date changes -> Update Prev End
    if (field === "start_date" && index > 0) {
      const prevIndex = index - 1;
      const prevEnd = toInputFormat(subDays(parseISO(newDate), 1));

      newCycles[prevIndex] = {
        ...newCycles[prevIndex],
        end_date: prevEnd,
        isModified: true, // Mark prev cycle as modified too
      };
    }

    setCycles(newCycles);
  };

  const handleReset = (index: number) => {
    // Re-calculate defaults for just this row (and neighbors potentially?
    // Resetting usually implies going back to standard calculation)
    // For simplicity, we just reload the whole year logic or calc locally.
    // Let's rely on the useEffect to re-sync if we remove the override in DB.
    // But for local UI reset, we can just calc defaults.

    const monthIndex = index;
    const defStart = getCycleStartDate(year, monthIndex - 1);
    const defNext = getCycleStartDate(year, monthIndex);
    const defEnd = new Date(defNext);
    defEnd.setDate(defEnd.getDate() - 1);

    handleDateChange(index, "start_date", toInputFormat(defStart));
    handleDateChange(index, "end_date", toInputFormat(defEnd));
  };

  const handleSave = async (index: number) => {
    const current = cycles[index];
    setLoadingKey(current.key);

    try {
      // 1. Save the current row
      const promises = [
        upsertCycle({
          key: current.key,
          start_date: current.start_date,
          end_date: current.end_date,
        }),
      ];

      // 2. SMART SAVE: Check neighbors
      // If we modified the End Date, we likely auto-modified the Next Start.
      // We should save the next cycle too so they don't get out of sync.
      if (index < 11) {
        const next = cycles[index + 1];
        // If next cycle starts exactly 1 day after current ends, save it too
        // to ensure the DB reflects this link.
        const expectedNextStart = toInputFormat(
          addDays(parseISO(current.end_date), 1),
        );
        if (next.start_date === expectedNextStart) {
          promises.push(
            upsertCycle({
              key: next.key,
              start_date: next.start_date,
              end_date: next.end_date,
            }),
          );
        }
      }

      // Same for previous if we changed start
      if (index > 0) {
        const prev = cycles[index - 1];
        const expectedPrevEnd = toInputFormat(
          subDays(parseISO(current.start_date), 1),
        );
        if (prev.end_date === expectedPrevEnd) {
          promises.push(
            upsertCycle({
              key: prev.key,
              start_date: prev.start_date,
              end_date: prev.end_date,
            }),
          );
        }
      }

      await Promise.all(promises);
    } finally {
      setLoadingKey(null);
    }
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
            {cycles.map((row, index) => (
              <CycleRow
                key={row.key}
                data={row}
                loading={loadingKey === row.key}
                onDateChange={(field, val) =>
                  handleDateChange(index, field, val)
                }
                onSave={() => handleSave(index)}
                onReset={() => handleReset(index)}
              />
            ))}
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
  isDirty: boolean; // (Unused in this simplified version, kept for compat)
  isModified: boolean;
}) {
  const dateObj = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left font-mono text-xs px-3",
            !value && "text-muted-foreground",
            // Use simpler logic: if it matches the override, show amber.
            // If we had "dirty vs saved" logic fully separated, we could do blue.
            isModified
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
          defaultMonth={dateObj} // <--- FIX: Opens calendar in the correct month
          onSelect={(d) => d && onChange(toInputFormat(d))} // <--- FIX: Uses local time
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function CycleRow({
  data,
  loading,
  onDateChange,
  onSave,
  onReset,
}: {
  data: CycleRowData;
  loading: boolean;
  onDateChange: (field: "start_date" | "end_date", val: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <tr
      className={clsx(
        "transition-colors group",
        data.isModified
          ? "bg-amber-50/40 hover:bg-amber-50/60"
          : "hover:bg-slate-50",
      )}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col">
          <span className="font-medium text-slate-700">{data.monthLabel}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {data.key}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 align-middle">
        <DateCell
          value={data.start_date}
          onChange={(v) => onDateChange("start_date", v)}
          isDirty={false}
          isModified={data.isModified}
        />
      </td>

      <td className="px-4 py-3 align-middle">
        <DateCell
          value={data.end_date}
          onChange={(v) => onDateChange("end_date", v)}
          isDirty={false}
          isModified={data.isModified}
        />
      </td>

      <td className="px-4 py-3 align-middle text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {data.isModified && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={onReset}
              title="Reset to default"
            >
              <RotateCcw size={14} />
            </Button>
          )}
          {data.isModified && (
            <Button
              size="icon"
              className="h-8 w-8 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              onClick={onSave}
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

"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  from: string;          // "YYYY-MM-DD" or ""
  to: string;            // "YYYY-MM-DD" or ""
  onChange: (from: string, to: string) => void;
  className?: string;
}

function toDate(s: string) {
  return s ? new Date(s + "T00:00:00") : undefined;
}

function fromDate(d: Date | undefined) {
  if (!d) return "";
  // Use local year/month/day — toISOString() shifts to UTC and gives the wrong
  // date for any timezone ahead of UTC (e.g. UTC+1 turns midnight → prev day).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDate(s: string) {
  return format(new Date(s + "T00:00:00"), "dd MMM yyyy");
}

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const range: DateRange | undefined =
    from || to
      ? { from: toDate(from), to: toDate(to) }
      : undefined;

  const hasSelection = !!(from || to);

  // Label: single date when from === to (or only from set), range otherwise
  const label = !hasSelection
    ? "Pick a date or range"
    : from && to && from !== to
      ? `${fmtDate(from)} – ${fmtDate(to)}`
      : fmtDate(from || to);

  // Commit current selection and close.
  // If only "from" is set, snap "to" to the same day → single-day filter.
  const apply = () => {
    if (from && !to) onChange(from, from);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) apply(); else setOpen(true); }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-9 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium transition",
            "hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400",
            hasSelection ? "text-slate-800" : "text-slate-400",
            className
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          {label}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          defaultMonth={toDate(from) ?? new Date()}
          onSelect={(r) => {
            onChange(fromDate(r?.from), fromDate(r?.to));
            // Auto-close only when a full range (both ends different) is chosen
            if (r?.from && r?.to && fromDate(r.from) !== fromDate(r.to)) {
              setOpen(false);
            }
          }}
          numberOfMonths={2}
          captionLayout="label"
        />

        {/* Footer: Apply (always shown while open) + Clear (when something is selected) */}
        <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400">
            {from && !to
              ? "Click Apply for single day, or pick an end date"
              : from && to && from === to
                ? "Single day selected"
                : from && to
                  ? "Range selected"
                  : "Click a start date"}
          </p>
          <div className="flex items-center gap-1.5">
            {hasSelection && (
              <button
                onClick={() => { onChange("", ""); }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
            <button
              onClick={apply}
              disabled={!hasSelection}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

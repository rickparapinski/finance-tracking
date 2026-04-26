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
  return d ? d.toISOString().slice(0, 10) : "";
}

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const range: DateRange | undefined =
    from || to
      ? { from: toDate(from), to: toDate(to) }
      : undefined;

  const hasRange = !!(from || to);

  const label = hasRange
    ? [
        from ? format(new Date(from + "T00:00:00"), "dd MMM yyyy") : "…",
        to   ? format(new Date(to   + "T00:00:00"), "dd MMM yyyy") : "…",
      ].join(" – ")
    : "Pick date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-9 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium transition",
            "hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400",
            hasRange ? "text-slate-800" : "text-slate-400",
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
            // close automatically once both ends are picked
            if (r?.from && r?.to) setOpen(false);
          }}
          numberOfMonths={2}
          captionLayout="label"
        />
        {hasRange && (
          <div className="border-t border-slate-100 px-3 py-2 flex justify-end">
            <button
              onClick={() => { onChange("", ""); setOpen(false); }}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="w-3 h-3" />
              Clear dates
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

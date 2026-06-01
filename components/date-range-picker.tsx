"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "pixelarticons/react/Calendar";
import { Close as X } from "pixelarticons/react/Close";
import { type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  from: string;   // "YYYY-MM-DD" or ""
  to: string;     // "YYYY-MM-DD" or ""
  onChange: (from: string, to: string) => void;
  className?: string;
}

function toDate(s: string) {
  return s ? new Date(s + "T00:00:00") : undefined;
}

function fromDate(d: Date | undefined) {
  if (!d) return "";
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
    from || to ? { from: toDate(from), to: toDate(to) } : undefined;

  const hasSelection = !!(from || to);

  const label = !hasSelection
    ? "pick a range"
    : from && to && from !== to
      ? `${fmtDate(from)} – ${fmtDate(to)}`
      : fmtDate(from || to);

  const apply = () => {
    if (from && !to) onChange(from, from);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) apply(); else setOpen(true); }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            // Secondary button style — square, surface fill, ink border, 2px shadow (compact for toolbar)
            "h-7 inline-flex items-center gap-1.5 border-2 border-ink bg-surface px-2.5 font-mono text-[11px]",
            "shadow-[2px_2px_0_#1F1F1F] hover:bg-cream-soft",
            "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            "focus:outline-none transition-none",
            hasSelection ? "text-ink" : "text-ink/40",
            className
          )}
        >
          <CalendarIcon className="w-3 h-3 shrink-0 text-ink/30" />
          {label}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 border-2 border-ink shadow-[4px_4px_0_#1F1F1F] bg-surface"
        align="start"
      >
        <Calendar
          mode="range"
          selected={range}
          defaultMonth={toDate(from) ?? new Date()}
          onSelect={(r) => {
            onChange(fromDate(r?.from), fromDate(r?.to));
            if (r?.from && r?.to && fromDate(r.from) !== fromDate(r.to)) {
              setOpen(false);
            }
          }}
          numberOfMonths={2}
          captionLayout="label"
        />

        {/* Footer */}
        <div className="border-t border-ink/10 px-3 py-2 flex items-center justify-between gap-2 bg-surface">
          <p className="font-mono text-[10px] text-ink/40">
            {from && !to
              ? "click apply for single day, or pick an end date"
              : from && to && from === to
                ? "single day selected"
                : from && to
                  ? "range selected"
                  : "click a start date"}
          </p>
          <div className="flex items-center gap-1.5">
            {hasSelection && (
              <button
                onClick={() => onChange("", "")}
                className="inline-flex items-center gap-1 border-2 border-ink/30 bg-surface px-2 py-0.5 font-pixel text-[10px] text-ink/50 shadow-[1px_1px_0_#1F1F1F] hover:bg-cream-soft transition-none"
              >
                <X className="size-3" />
                clear
              </button>
            )}
            <button
              onClick={apply}
              disabled={!hasSelection}
              className="inline-flex items-center gap-1 border-2 border-ink bg-lime text-ink px-2.5 py-0.5 font-pixel text-[10px] shadow-[2px_2px_0_#1F1F1F] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-none"
            >
              apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

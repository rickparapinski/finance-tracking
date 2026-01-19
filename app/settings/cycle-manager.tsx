"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { upsertCycle, CycleConfig } from "./actions";
import { getCycleStartDate, getNextWorkingDay } from "@/lib/finance-utils";

export function CycleManager({ existingCycles }: { existingCycles: any[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState<string | null>(null);

  // Generate a list of 12 months for the selected year to render the table
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
    // Re-run your standard logic client-side to reset to default
    const start = getCycleStartDate(year, monthIndex);
    const nextStart = getCycleStartDate(year, monthIndex + 1);
    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);

    await handleSave(
      key,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Period Management</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>
            ←
          </Button>
          <span className="font-bold w-12 text-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>
            →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-4 text-xs font-bold text-muted-foreground uppercase mb-2 px-2">
            <div className="col-span-2">Cycle</div>
            <div className="col-span-4">Start Date</div>
            <div className="col-span-4">End Date</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {months.map((monthIndex) => {
            const cycleKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

            // Check if we have a DB override
            const override = existingCycles.find((c) => c.key === cycleKey);

            // Calculate default for display/fallback
            const defStart = getCycleStartDate(year, monthIndex);
            const defNext = getCycleStartDate(year, monthIndex + 1);
            const defEnd = new Date(defNext);
            defEnd.setDate(defEnd.getDate() - 1);

            // Active values
            const currentStart = override
              ? override.start_date
              : defStart.toISOString().split("T")[0];
            const currentEnd = override
              ? override.end_date
              : defEnd.toISOString().split("T")[0];
            const isModified = !!override;

            return (
              <CycleRow
                key={cycleKey}
                cycleKey={cycleKey}
                start={currentStart}
                end={currentEnd}
                isModified={isModified}
                loading={loading === cycleKey}
                onSave={handleSave}
                onReset={() => handleAutoCalculate(cycleKey, monthIndex)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CycleRow({
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

  return (
    <div
      className={`grid grid-cols-12 gap-4 items-center p-2 rounded-md transition-colors ${isModified ? "bg-amber-50/50 dark:bg-amber-950/20" : "hover:bg-slate-50"}`}
    >
      <div className="col-span-2 font-medium text-sm">{cycleKey}</div>
      <div className="col-span-4">
        <Input
          type="date"
          value={s}
          onChange={(e) => setS(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      <div className="col-span-4">
        <Input
          type="date"
          value={e}
          onChange={(e) => setE(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      <div className="col-span-2 flex justify-end gap-1">
        {(isDirty || isModified) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:text-slate-600"
            onClick={onReset}
            title="Reset to auto-calculated"
          >
            <RotateCcw size={14} />
          </Button>
        )}
        {isDirty && (
          <Button
            size="icon"
            className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => onSave(cycleKey, s, e)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Save size={14} />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

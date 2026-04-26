import { DashboardCard } from "./dashboard-card";

function fmt(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function SurvivalCard({
  salary,
  plannedExpenses,
  freePool,
  daysLeft,
  daysTotal,
}: {
  salary: number;
  plannedExpenses: number;
  freePool: number;
  daysLeft: number;
  daysTotal: number;
}) {
  const dailyRate = daysTotal > 0 ? freePool / daysTotal : 0;
  const pct = Math.round(((daysTotal - daysLeft) / daysTotal) * 100);
  const isHealthy = freePool >= 0;

  return (
    <DashboardCard title="Daily Budget">
      {/* Big number */}
      <div className="mb-5">
        <div className={`text-3xl font-bold tabular-nums ${isHealthy ? "text-slate-900" : "text-rose-600"}`}>
          {fmt(dailyRate)}
          <span className="text-sm font-normal text-slate-400 ml-1">/day</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{daysLeft} days left in cycle</p>
      </div>

      {/* Cycle progress bar */}
      <div className="mb-5">
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>Day {daysTotal - daysLeft}</span>
          <span>Day {daysTotal}</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Salary</span>
          <span className="font-medium text-emerald-600 tabular-nums">{fmt(salary)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Planned</span>
          <span className="font-medium text-slate-700 tabular-nums">−{fmt(plannedExpenses)}</span>
        </div>
        <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Free pool</span>
          <span className={`font-bold tabular-nums ${isHealthy ? "text-slate-900" : "text-rose-600"}`}>
            {fmt(freePool)}
          </span>
        </div>
      </div>
    </DashboardCard>
  );
}

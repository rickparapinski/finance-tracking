import { DashboardCard } from "./dashboard-card";

function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function kpiChip({ icon, bg }: { icon: string; bg: string }) {
  return (
    <div className={`grid size-8 place-items-center rounded-full ${bg}`}>
      <span className="text-xs">{icon}</span>
    </div>
  );
}

/**
 * Keep it simple for now:
 * - worth: whatever you define (net worth or balance sum)
 * - spent: positive number representing total expenses for the period
 */
export function ReportsCard({
  worth,
  spent,
  currency = "EUR",
}: {
  worth: number;
  spent: number;
  currency?: string;
}) {
  return (
    <DashboardCard title="Reports">
      <div className="mb-3 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          {kpiChip({ icon: "💰", bg: "bg-emerald-50" })}
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {formatMoney(worth, currency)}
            </div>
            <div className="text-xs text-slate-400">Worth</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {kpiChip({ icon: "🧾", bg: "bg-rose-50" })}
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {formatMoney(spent, currency)}
            </div>
            <div className="text-xs text-slate-400">Spent</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400 mb-2">Earn by Category</div>

      {/* Sparkline placeholder: swap later for Recharts */}
      <div className="h-20 rounded-xl bg-[rgb(238,242,255)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-60">
          <svg
            viewBox="0 0 300 80"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <path
              d="M0,60 C30,55 45,65 70,58 C95,51 120,55 145,45 C170,35 200,42 225,30 C250,18 270,25 300,10"
              fill="none"
              stroke="rgb(59,130,246)"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </DashboardCard>
  );
}

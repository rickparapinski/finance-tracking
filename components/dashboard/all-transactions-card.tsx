import { DashboardCard } from "./dashboard-card";

export type TxPreview = {
  id: string;
  description: string;
  category?: string | null;
  date?: string | null;
  amount: number;
  currency?: string; // optional; if you already have EUR, pass "EUR"
};

function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AllTransactionsCard({
  items,
  currency = "EUR",
}: {
  items: TxPreview[];
  currency?: string;
}) {
  return (
    <DashboardCard title="All Transaction">
      <div className="space-y-4">
        {items.slice(0, 3).map((t) => {
          const isIncome = t.amount > 0;
          return (
            <div key={t.id} className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">
                  {t.description}
                </div>
                <div className="text-xs text-slate-400">
                  {(t.date ?? "").slice(0, 10)}
                  {t.category ? ` · ${t.category}` : ""}
                </div>
              </div>

              <div
                className={[
                  "text-sm font-semibold tabular-nums",
                  isIncome ? "text-emerald-500" : "text-rose-500",
                ].join(" ")}
              >
                {formatMoney(Math.abs(t.amount), t.currency || currency)}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

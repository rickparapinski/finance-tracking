"use client";

import { useMemo, useState } from "react";

type MonthRow = {
  key: string; // YYYY-MM
  label: string;
  opening: number;
  actual: number;
  projected: number;
  net: number;
  closing: number;
};

type FcItem = {
  id: string;
  date: string;
  amount: number;
  status: "projected" | "realized" | "skipped";
  ruleName?: string;
  category?: string;
  type?: string;
  note?: string | null;
};

export function ForecastTable({
  rows,
  detailsByMonth,
}: {
  rows: MonthRow[];
  detailsByMonth: Record<string, FcItem[]>;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const fmt = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n),
    [],
  );

  const clsMoney = (n: number) => {
    if (n > 0.005) return "text-emerald-700";
    if (n < -0.005) return "text-rose-700";
    return "text-slate-700";
  };

  const clsMoneyStrong = (n: number) => {
    if (n > 0.005) return "text-emerald-800";
    if (n < -0.005) return "text-rose-800";
    return "text-slate-900";
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-[var(--shadow-soft)]">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-slate-800">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Month</th>
            <th className="px-4 py-3 text-right font-semibold">Opening</th>
            <th className="px-4 py-3 text-right font-semibold">Actual</th>
            <th className="px-4 py-3 text-right font-semibold">Projected</th>
            <th className="px-4 py-3 text-right font-semibold">Net</th>
            <th className="px-4 py-3 text-right font-semibold">Closing</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {rows.map((r) => {
            const isOpen = openMonth === r.key;
            const items = detailsByMonth[r.key] ?? [];
            const projectedItems = items.filter(
              (x) => x.status === "projected",
            );

            return (
              <>
                <tr
                  key={r.key}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() =>
                    setOpenMonth((m) => (m === r.key ? null : r.key))
                  }
                  aria-expanded={isOpen}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block size-2 rounded-full ${
                          projectedItems.length
                            ? "bg-amber-400"
                            : "bg-slate-300"
                        }`}
                        title={
                          projectedItems.length
                            ? "Has projected items"
                            : "No projected items"
                        }
                      />
                      {r.label}
                      <span className="ml-2 text-xs text-slate-500">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800">
                    {fmt(r.opening)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${clsMoney(r.actual)}`}
                  >
                    {fmt(r.actual)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${clsMoney(r.projected)}`}
                  >
                    {fmt(r.projected)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${clsMoney(r.net)}`}
                  >
                    {fmt(r.net)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-semibold ${clsMoneyStrong(r.closing)}`}
                  >
                    {fmt(r.closing)}
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${r.key}-details`} className="bg-slate-50">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="text-xs text-slate-600 mb-2">
                        Projected items in {r.label}
                      </div>

                      {projectedItems.length === 0 ? (
                        <div className="text-sm text-slate-600">
                          No projected items.
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100">
                            <div className="col-span-2">Date</div>
                            <div className="col-span-6">Name</div>
                            <div className="col-span-2">Category</div>
                            <div className="col-span-2 text-right">Amount</div>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {projectedItems.map((it) => (
                              <div
                                key={it.id}
                                className="grid grid-cols-12 gap-2 px-3 py-2 text-sm"
                              >
                                <div className="col-span-2 font-mono text-slate-700">
                                  {it.date}
                                </div>
                                <div className="col-span-6 text-slate-900">
                                  {it.ruleName ?? "Forecast item"}
                                  {it.type ? (
                                    <span className="ml-2 text-xs text-slate-500">
                                      ({it.type})
                                    </span>
                                  ) : null}
                                  {it.note ? (
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {it.note}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="col-span-2 text-slate-700">
                                  {it.category ?? "Uncategorized"}
                                </div>
                                <div
                                  className={`col-span-2 text-right font-mono ${clsMoney(it.amount)}`}
                                >
                                  {fmt(it.amount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

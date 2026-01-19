"use client";

import { useMemo, useState } from "react";
import { updateForecastInstanceAmount } from "./actions"; // ensure this exists
import { formatCurrency } from "@/lib/finance-utils"; // or local helper

type MonthRow = {
  key: string;
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
  transaction_id?: string | null;
};

export function ForecastTable({
  rows,
  detailsByMonth,
}: {
  rows: MonthRow[];
  detailsByMonth: Record<string, FcItem[]>;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Status Badge Helper
  const StatusBadge = ({
    status,
    isLinked,
  }: {
    status: string;
    isLinked: boolean;
  }) => {
    if (status === "realized" || isLinked) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
          Realized
        </span>
      );
    }
    if (status === "skipped") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
          Skipped
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
        Projected
      </span>
    );
  };

  // Editable Cell
  const EditableAmount = ({ item }: { item: FcItem }) => {
    const [val, setVal] = useState(String(item.amount));

    // Only projected items without a hard link should be easily editable in "Play" mode
    // (Or allow editing realized too, but that's rarer)
    if (item.status === "realized" || item.transaction_id) {
      return (
        <span className={clsMoney(item.amount)}>
          {formatCurrency(item.amount)}
        </span>
      );
    }

    if (editingId === item.id) {
      return (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await updateForecastInstanceAmount(item.id, parseFloat(val));
            setEditingId(null);
          }}
          className="flex justify-end"
        >
          <input
            autoFocus
            className="w-20 text-right text-xs p-1 border border-blue-400 rounded shadow-sm focus:outline-none"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => setEditingId(null)}
          />
        </form>
      );
    }

    return (
      <button
        onClick={() => setEditingId(item.id)}
        className={`hover:bg-slate-100 px-1 rounded transition cursor-text border border-transparent hover:border-slate-200 ${clsMoney(item.amount)}`}
        title="Click to edit (Scenario Planning)"
      >
        {formatCurrency(item.amount)}
      </button>
    );
  };

  const clsMoney = (n: number) => {
    if (n > 0.005) return "text-emerald-700 font-mono";
    if (n < -0.005) return "text-rose-700 font-mono";
    return "text-slate-400 font-mono";
  };

  const clsMoneyStrong = (n: number) => {
    if (n > 0.005) return "text-emerald-800 font-mono font-bold";
    if (n < -0.005) return "text-rose-800 font-mono font-bold";
    return "text-slate-900 font-mono font-bold";
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-[var(--shadow-soft)]">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold w-48">Month</th>
            <th className="px-4 py-3 text-right font-semibold">Opening</th>
            <th className="px-4 py-3 text-right font-semibold">Actual</th>
            <th className="px-4 py-3 text-right font-semibold">Projected</th>
            <th className="px-4 py-3 text-right font-semibold">Net</th>
            <th className="px-4 py-3 text-right font-semibold">Closing</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const isOpen = openMonth === r.key;
            const items = detailsByMonth[r.key] ?? [];
            const projectedCount = items.filter(
              (x) => x.status === "projected",
            ).length;

            return (
              <>
                <tr
                  key={r.key}
                  onClick={() =>
                    setOpenMonth((m) => (m === r.key ? null : r.key))
                  }
                  className={`cursor-pointer transition-colors ${isOpen ? "bg-slate-50" : "hover:bg-slate-50/50"}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-1.5 rounded-full ${projectedCount ? "bg-amber-400" : "bg-slate-200"}`}
                      />
                      {r.label}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">
                    {formatCurrency(r.opening)}
                  </td>
                  <td className={`px-4 py-3 text-right ${clsMoney(r.actual)}`}>
                    {formatCurrency(r.actual)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${clsMoney(r.projected)}`}
                  >
                    {formatCurrency(r.projected)}
                  </td>
                  <td className={`px-4 py-3 text-right ${clsMoney(r.net)}`}>
                    {formatCurrency(r.net)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${clsMoneyStrong(r.closing)}`}
                  >
                    {formatCurrency(r.closing)}
                  </td>
                </tr>

                {isOpen && (
                  <tr className="bg-slate-50 shadow-inner">
                    <td colSpan={6} className="p-4">
                      {items.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs py-2">
                          No items in this period
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-slate-500 font-semibold text-left">
                              <tr>
                                <th className="px-3 py-2">Date</th>
                                <th className="px-3 py-2">
                                  Rule / Description
                                </th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {items.map((it) => (
                                <tr
                                  key={it.id}
                                  className="group hover:bg-blue-50/30 transition"
                                >
                                  <td className="px-3 py-2 font-mono text-slate-500">
                                    {it.date.slice(8)}.{it.date.slice(5, 7)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">
                                    <div className="font-medium">
                                      {it.ruleName}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {it.category} {it.note && `• ${it.note}`}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <StatusBadge
                                      status={it.status}
                                      isLinked={!!it.transaction_id}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <EditableAmount item={it} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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

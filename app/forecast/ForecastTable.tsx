"use client";

import { useState, Fragment } from "react"; // <--- 1. Import Fragment
import { updateForecastInstanceAmount } from "./actions";
import { formatCurrency } from "@/lib/finance-utils";
import { clsx } from "clsx";

// ... (keep types and helper functions exactly as they are) ...

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
  ruleId?: string;
  ruleType?: string;
  ruleName?: string;
  category?: string;
  note?: string | null;
  transaction_id?: string | null;
};

function groupItems(items: FcItem[]) {
  // ... (keep logic) ...
  const groups = new Map<string, FcItem[]>();
  const singles: FcItem[] = [];

  items.forEach((item) => {
    if (item.ruleId) {
      if (!groups.has(item.ruleId)) groups.set(item.ruleId, []);
      groups.get(item.ruleId)!.push(item);
    } else {
      singles.push(item);
    }
  });

  const finalResult: { type: "single" | "group"; data: FcItem | FcItem[] }[] =
    [];

  groups.forEach((groupItems) => {
    const first = groupItems[0];
    const isBudget = first.ruleType === "budget";

    if (isBudget || groupItems.length > 1) {
      finalResult.push({ type: "group", data: groupItems });
    } else {
      finalResult.push({ type: "single", data: first });
    }
  });

  singles.forEach((s) => finalResult.push({ type: "single", data: s }));

  return finalResult.sort((a, b) => {
    const itemA = Array.isArray(a.data) ? a.data[0] : a.data;
    const itemB = Array.isArray(b.data) ? b.data[0] : b.data;
    return itemA.amount - itemB.amount;
  });
}

export function ForecastTable({
  rows,
  detailsByMonth,
}: {
  rows: MonthRow[];
  detailsByMonth: Record<string, FcItem[]>;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const EditableAmount = ({ item }: { item: FcItem }) => {
    // ... (keep EditableAmount logic) ...
    const [val, setVal] = useState(String(item.amount));
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
      >
        {formatCurrency(item.amount)}
      </button>
    );
  };

  const BudgetProgressRow = ({ items }: { items: FcItem[] }) => {
    // ... (keep BudgetProgressRow logic) ...
    const first = items[0];

    const totalRealized = items
      .filter((i) => i.status === "realized")
      .reduce((sum, i) => sum + i.amount, 0);

    const totalProjected = items
      .filter((i) => i.status !== "realized")
      .reduce((sum, i) => sum + i.amount, 0);

    const totalBudget = totalRealized + totalProjected;
    const isExpense = totalBudget < 0;

    const absRealized = Math.abs(totalRealized);
    const absBudget = Math.abs(totalBudget);
    const spentPct =
      absBudget === 0 ? 0 : Math.min(100, (absRealized / absBudget) * 100);

    return (
      <tr className="group hover:bg-slate-50 transition">
        <td className="px-3 py-4 font-mono text-slate-500 align-top w-24 border-b border-slate-50">
          {first.date.slice(8)}.{first.date.slice(5, 7)}
        </td>
        <td className="px-3 py-3 align-middle border-b border-slate-50">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="font-medium text-slate-800 text-sm">
                {first.ruleName}
              </div>
            </div>

            <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  isExpense ? "bg-amber-400" : "bg-emerald-400",
                )}
                style={{ width: `${spentPct}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>
                Spent:{" "}
                <span className="font-medium text-slate-600">
                  {formatCurrency(totalRealized)}
                </span>
              </span>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 align-middle border-b border-slate-50">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
            Budget
          </span>
        </td>
        <td className="px-3 py-3 text-right align-middle font-mono font-bold text-slate-700 border-b border-slate-50">
          {formatCurrency(totalProjected)}
        </td>
      </tr>
    );
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
            const grouped = groupItems(items);

            const projectedCount = items.filter(
              (x) => x.status === "projected",
            ).length;

            return (
              /* 2. Changed <> to <Fragment key={...}> */
              <Fragment key={r.key}>
                <tr
                  /* 3. Removed key={r.key} from here, moved to Fragment above */
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
                      {grouped.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs py-2">
                          No items in this period
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100/50 text-slate-500 font-semibold text-left border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 w-24">Date</th>
                                <th className="px-3 py-2">
                                  Rule / Description
                                </th>
                                <th className="px-3 py-2 w-24">Status</th>
                                <th className="px-3 py-2 text-right w-32">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                              {grouped.map((entry, idx) => {
                                if (entry.type === "group") {
                                  return (
                                    <BudgetProgressRow
                                      key={idx}
                                      items={entry.data as FcItem[]}
                                    />
                                  );
                                }
                                const it = entry.data as FcItem;
                                return (
                                  <tr
                                    key={it.id}
                                    className="group hover:bg-blue-50/30 transition"
                                  >
                                    <td className="px-3 py-3 font-mono text-slate-500 border-b border-slate-50">
                                      {it.date.slice(8)}.{it.date.slice(5, 7)}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700 border-b border-slate-50">
                                      <div className="font-medium text-sm">
                                        {it.ruleName}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        {it.category}{" "}
                                        {it.note && `• ${it.note}`}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 border-b border-slate-50">
                                      <StatusBadge
                                        status={it.status}
                                        isLinked={!!it.transaction_id}
                                      />
                                    </td>
                                    <td className="px-3 py-3 text-right border-b border-slate-50">
                                      <EditableAmount item={it} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const clsMoney = (n: number) =>
  n > 0.005
    ? "text-emerald-700 font-mono"
    : n < -0.005
      ? "text-rose-700 font-mono"
      : "text-slate-400 font-mono";
const clsMoneyStrong = (n: number) =>
  n > 0.005
    ? "text-emerald-800 font-mono font-bold"
    : n < -0.005
      ? "text-rose-800 font-mono font-bold"
      : "text-slate-900 font-mono font-bold";

import { sql } from "@/lib/db";
import { formatCurrency } from "@/lib/finance-utils";
import { fetchCurrentCycle } from "@/lib/fetch-cycle";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { AllTransactionsCard } from "@/components/dashboard/all-transactions-card";
import { ReportsCard } from "@/components/dashboard/reports-card";
import { SchedulerCard } from "@/components/dashboard/scheduler-card";
import { cn } from "@/lib/utils";

export const revalidate = 0;

export default async function Dashboard() {
  const { start, end } = await fetchCurrentCycle();

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const accounts = await sql`
    SELECT id, name, currency, type, initial_balance
    FROM accounts
    ORDER BY name
  `;

  const cycleTransactions = await sql`
    SELECT * FROM transactions
    WHERE date >= ${startStr} AND date <= ${endStr}
    ORDER BY date DESC
  `;

  const allHistory = await sql`
    SELECT account_id, amount FROM transactions
  `;

  // A. Calculate Account Balances
  const accountBalances = accounts.map((acc) => {
    const totalActivity =
      allHistory
        .filter((t) => t.account_id === acc.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      ...acc,
      currentBalance: Number(acc.initial_balance) + totalActivity,
    };
  });

  // B. Calculate Monthly Stats
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, number> = {};

  cycleTransactions.forEach((t) => {
    if (t.category === "Transfer") return;

    const val = Number(t.amount_eur ?? t.amount);

    if (val < 0) {
      totalExpense += Math.abs(val);
      const cat = t.category || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(val);
    } else {
      totalIncome += val;
    }
  });

  const netResult = totalIncome - totalExpense;
  const sortedCategories = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => b - a,
  );

  const top3Transactions = cycleTransactions.slice(0, 3).map((t) => {
    const val = Number(t.amount_eur ?? t.amount);
    return {
      id: String(t.id),
      description: t.description,
      category: t.category,
      date: t.date,
      amount: val,
      currency: "EUR",
    };
  });

  const netWorth = accountBalances.reduce(
    (sum, a) => sum + (a.currentBalance || 0),
    0,
  );
  const spentThisCycle = totalExpense;

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Overview
        </h1>
        <p className="text-sm text-slate-500">
          {start.toLocaleDateString()} — {end.toLocaleDateString()}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AllTransactionsCard items={top3Transactions} currency="EUR" />
        <ReportsCard worth={netWorth} spent={spentThisCycle} currency="EUR" />
        <SchedulerCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Spending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {sortedCategories.slice(0, 6).map(([cat, amount]) => {
              const percentage = Math.round((amount / totalExpense) * 100) || 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{cat}</span>
                    <span className="text-zinc-500">
                      {formatCurrency(amount)} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-zinc-900 dark:bg-zinc-100 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {sortedCategories.length === 0 && (
              <p className="text-zinc-500 italic">
                No expenses yet this cycle.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  type,
}: {
  title: string;
  value: number;
  type: "income" | "expense" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">
          {title}
        </CardTitle>
        {type === "income" && (
          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
        )}
        {type === "expense" && (
          <ArrowDownRight className="h-4 w-4 text-red-500" />
        )}
        {type === "neutral" && <Wallet className="h-4 w-4 text-zinc-500" />}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold",
            type === "expense" && "text-red-600",
            type === "income" && "text-emerald-600",
            type === "neutral" && "text-zinc-900 dark:text-zinc-50",
          )}
        >
          {formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
}

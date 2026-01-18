import { createClient } from "@supabase/supabase-js";
import { getCurrentCycle, formatCurrency } from "@/lib/finance-utils";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { AllTransactionsCard } from "@/components/dashboard/all-transactions-card";
import { ReportsCard } from "@/components/dashboard/reports-card";
import { SchedulerCard } from "@/components/dashboard/scheduler-card";
import { cn } from "@/lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Ensure fresh data
export const revalidate = 0;

export default async function Dashboard() {
  const { start, end } = getCurrentCycle();

  // 1. Fetch Accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, currency, type, initial_balance")
    .order("name");

  // 2. Fetch Cycle Transactions (For Income/Expense Charts)
  const { data: cycleTransactions } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", start.toISOString().split("T")[0])
    .lte("date", end.toISOString().split("T")[0])
    .order("date", { ascending: false });

  // 3. Fetch ALL Transactions (For Account Balances)
  const { data: allHistory } = await supabase
    .from("transactions")
    .select("account_id, amount");

  // --- CALCULATION LOGIC ---

  // A. Calculate Account Balances (Initial + History)
  const accountBalances = accounts?.map((acc) => {
    const totalActivity =
      allHistory
        ?.filter((t) => t.account_id === acc.id)
        .reduce((sum, t) => sum + t.amount, 0) || 0;

    return {
      ...acc,
      currentBalance: acc.initial_balance + totalActivity,
    };
  });

  // B. Calculate Monthly Stats (Income vs Expense)
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, number> = {};

  cycleTransactions?.forEach((t) => {
    // We use amount_eur if available, otherwise fallback to amount (assuming EUR)
    const val = t.amount_eur || t.amount;

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
    ([, a], [, b]) => b - a
  );

  // --- TOP ROW CARD DATA (for the 3 widgets) ---

  // 1) All Transactions (take the 3 most recent items in the cycle)
  const top3Transactions =
    cycleTransactions?.slice(0, 3).map((t) => {
      const val = t.amount_eur ?? t.amount; // fallback if amount_eur is null
      return {
        id: String(t.id),
        description: t.description,
        category: t.category,
        date: t.date,
        amount: val, // keep sign; card colors it
        currency: "EUR",
      };
    }) || [];

  // 2) Reports: "Worth" = sum of account current balances
  const netWorth =
    accountBalances?.reduce((sum, a) => sum + (a.currentBalance || 0), 0) || 0;

  // 3) Reports: "Spent" = total expenses in this cycle (already positive in your calc)
  const spentThisCycle = totalExpense;

  return (
    <div className="p-6 md:p-10 space-y-10">
      {/* HEADER */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Overview
        </h1>
        <p className="text-sm text-slate-500">
          {start.toLocaleDateString()} — {end.toLocaleDateString()}
        </p>
      </header>

      {/* 1. ALL TRANSACTIONS, REPORTS AND SCHEDULER */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AllTransactionsCard items={top3Transactions} currency="EUR" />
        <ReportsCard worth={netWorth} spent={spentThisCycle} currency="EUR" />
        <SchedulerCard />
      </div>

      {/* 3. MAIN CONTENT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Spending Breakdown */}
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
    </div>
  );
}

// --- SUB-COMPONENTS ---

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
            type === "neutral" && "text-zinc-900 dark:text-zinc-50"
          )}
        >
          {formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
}

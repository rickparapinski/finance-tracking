"use client";

import { Bell, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Nah, type NahExpression } from "@/components/Nah";
import { useHideBalances } from "@/contexts/hide-balances";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardData {
  cycleStart: string;
  cycleEnd: string;
  daysLeft: number;
  daysTotal: number;
  dailyAllowance: number;
  spentToday: number;
  assets: number;
  liabilities: number;
  netWorth: number;
  daysSinceLastLog: number;
  loggedDays: boolean[];
  dayLabels: string[];
  recentTransactions: { label: string; category: string; amount: number; date: string }[];
  spending: { name: string; spent: number; budget: number | null }[];
  upcomingBills: { name: string; amount: number; daysUntil: number }[];
  debtAccountCount: number;
  attackNext: { name: string; balance: number } | null;
  nextDueBill: { name: string; amount: number; date: string } | null;
  inboxCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function eur(n: number, dec = 0) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);
}

const mask = (v: string, hidden: boolean) => (hidden ? "••••" : v);

function streakState(days: number): { expression: NahExpression; copy: string | null; lime: boolean } {
  if (days === 0) return { expression: "default",      copy: "logged today.",                    lime: true  };
  if (days === 1) return { expression: "default",      copy: "logged yesterday.",                lime: false };
  if (days === 2) return { expression: "skeptical",    copy: "haven't seen you log.",             lime: false };
  if (days <= 6)  return { expression: "disappointed", copy: `${days} days. you're slipping.`,   lime: false };
  if (days <= 14) return { expression: "disappointed", copy: "we both know what's happening.",   lime: false };
  return               { expression: "disappointed",   copy: `${days} days. you're slipping.`,   lime: false };
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function Segs({ filled, total = 8, dark = false }: { filled: number; total?: number; dark?: boolean }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-[2px]"
          style={{
            backgroundColor:
              i < filled
                ? "#C5F03A"
                : dark
                ? "rgba(250,247,236,0.1)"
                : "rgba(31,31,31,0.1)",
          }}
        />
      ))}
    </div>
  );
}

function PixelBtn({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls =
    "font-pixel text-[10px] border-2 border-ink rounded-sm px-2.5 py-1 bg-surface text-ink " +
    "shadow-[2px_2px_0_#1F1F1F] hover:bg-lime hover:border-lime " +
    "hover:shadow-[1px_1px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px] " +
    "active:shadow-none active:translate-x-[2px] active:translate-y-[2px] " +
    "cursor-pointer transition-none select-none";
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls}>{children}</button>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border-2 border-ink rounded-md p-4 shadow-[2px_2px_0_rgba(31,31,31,0.09)] ${className}`}>
      {children}
    </div>
  );
}

// ─── TODAY hero ────────────────────────────────────────────────────────────────

function TodayHero({ dailyAllowance, spentToday, hidden }: { dailyAllowance: number; spentToday: number; hidden: boolean }) {
  const pct = dailyAllowance > 0 ? spentToday / dailyAllowance : 0;
  const remaining = Math.max(0, dailyAllowance - spentToday);
  const remainingSegs = Math.max(0, Math.ceil((1 - pct) * 8));

  const nahExpression: NahExpression =
    pct > 1    ? "disappointed" :
    pct >= 0.5 ? "skeptical"   :
                 "default";

  const nahCopy =
    nahExpression === "skeptical"    ? "easy."         :
    nahExpression === "disappointed" ? "over already?" :
    null;

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Card className="px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-pixel text-ink text-sm tracking-widest">today</h2>
            <span className="font-mono text-xs text-ink-soft">{dateLabel}</span>
          </div>

          <p className="font-mono font-bold text-ink leading-none" style={{ fontSize: 64 }}>
            {mask(eur(remaining, 2), hidden)}
          </p>
          <p className="font-sans text-sm text-ink-soft mt-1 mb-3">remaining today</p>

          <Segs filled={remainingSegs} />

          <div className="flex gap-6 mt-2">
            <div>
              <p className="font-sans text-[10px] text-ink-soft">already spent</p>
              <p className="font-mono text-sm text-ink mt-0.5">{mask(eur(spentToday, 2), hidden)}</p>
            </div>
            <div>
              <p className="font-sans text-[10px] text-ink-soft">daily allowance</p>
              <p className="font-mono text-sm text-ink mt-0.5">{mask(eur(dailyAllowance, 2), hidden)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <Nah expression={nahExpression} size={96} />
          {nahCopy && (
            <p className="font-sans text-[10px] text-ink-soft text-center">{nahCopy}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Streak strip ──────────────────────────────────────────────────────────────

function StreakStrip({ daysSinceLastLog, loggedDays, dayLabels }: {
  daysSinceLastLog: number;
  loggedDays: boolean[];
  dayLabels: string[];
}) {
  const state = streakState(daysSinceLastLog);
  const lastLoggedLabel =
    daysSinceLastLog === 0 ? "logged today" :
    daysSinceLastLog === 1 ? "logged yesterday" :
    `last logged ${daysSinceLastLog}d ago`;

  return (
    <Card className="px-4 py-2 flex items-center justify-between gap-6">
      <span className="font-mono text-xs text-ink-soft shrink-0">{lastLoggedLabel}</span>

      <div className="flex items-end gap-2">
        {loggedDays.map((logged, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{
                backgroundColor: logged ? "#C5F03A" : "transparent",
                borderColor:     logged ? "#C5F03A" : "rgba(31,31,31,0.18)",
              }}
            />
            <span className="font-mono text-[8px] text-ink-soft/40">{dayLabels[i]}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {state.copy && (
          <span
            className="font-sans text-xs"
            style={{ color: state.lime ? "#C5F03A" : "rgba(31,31,31,0.5)" }}
          >
            {state.copy}
          </span>
        )}
        <Nah expression={state.expression} size={32} />
      </div>
    </Card>
  );
}

// ─── Debt hero card ────────────────────────────────────────────────────────────

function DebtHeroCard({ liabilities, debtAccountCount, attackNext, nextDueBill, hidden }: {
  liabilities: number;
  debtAccountCount: number;
  attackNext: { name: string; balance: number } | null;
  nextDueBill: { name: string; amount: number; date: string } | null;
  hidden: boolean;
}) {
  return (
    <div className="bg-ink border-2 border-ink rounded-md px-4 py-3">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="font-sans text-[10px] text-cream-soft/45 mb-0.5">total debt</p>
          <p className="font-mono text-xl text-cream-soft font-bold leading-none">
            {mask(eur(liabilities), hidden)}
          </p>
        </div>
        <p className="font-sans text-[10px] text-cream-soft/30 mt-1">accounts: {debtAccountCount}</p>
      </div>

      <div className="flex items-end justify-between pt-2 border-t border-white/10">
        <div className="flex gap-5">
          {attackNext && (
            <div>
              <p className="font-sans text-[10px] text-cream-soft/40 mb-0.5">attack next</p>
              <p className="font-pixel text-cream-soft text-xs">{attackNext.name}</p>
              <p className="font-mono text-[10px] text-cream-soft/55">
                {mask(eur(Math.abs(attackNext.balance)), hidden)} left
              </p>
            </div>
          )}
          {nextDueBill && (
            <div>
              <p className="font-sans text-[10px] text-cream-soft/40 mb-0.5">next due</p>
              <p className="font-pixel text-cream-soft text-xs">{nextDueBill.date}</p>
              <p className="font-mono text-[10px] text-cream-soft/55">
                {nextDueBill.name} · {mask(eur(Math.abs(nextDueBill.amount)), hidden)}
              </p>
            </div>
          )}
        </div>
        <Nah expression="approving" size={96} />
      </div>
    </div>
  );
}

// ─── Upcoming bills ────────────────────────────────────────────────────────────

function UpcomingBills({ bills, hidden }: {
  bills: { name: string; amount: number; daysUntil: number }[];
  hidden: boolean;
}) {
  const total = bills.reduce((s, b) => s + b.amount, 0);

  function pillStyle(days: number) {
    if (days <= 1) return { bg: "#C5F03A", border: "#C5F03A", color: "#1F1F1F" };
    if (days <= 5) return { bg: "transparent", border: "#1F1F1F", color: "#1F1F1F" };
    return             { bg: "transparent", border: "rgba(31,31,31,0.3)", color: "rgba(31,31,31,0.45)" };
  }

  if (bills.length === 0) return null;

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-pixel text-ink text-xs tracking-wide">upcoming</h2>
        <span className="font-mono text-[10px] text-ink-soft">next 14 days</span>
      </div>
      <div className="space-y-1.5">
        {bills.map((bill, i) => {
          const s = pillStyle(bill.daysUntil);
          return (
            <div key={i} className="flex items-center gap-3">
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-full border-2 shrink-0 whitespace-nowrap"
                style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}
              >
                {bill.daysUntil === 0 ? "today" : `in ${bill.daysUntil}`}
              </span>
              <span className="font-sans text-sm text-ink flex-1 truncate">{bill.name}</span>
              <span className="font-mono text-sm text-ink shrink-0">
                {mask(eur(Math.abs(bill.amount)), hidden)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t-2 border-ink flex justify-between items-baseline">
        <span className="font-sans text-xs text-ink-soft">total committed</span>
        <span className="font-mono text-sm text-ink font-bold">{mask(eur(total), hidden)}</span>
      </div>
    </Card>
  );
}

// ─── Spending row ──────────────────────────────────────────────────────────────

function SpendingRow({ name, spent, budget, maxSpent }: {
  name: string; spent: number; budget: number | null; maxSpent: number;
}) {
  const over   = budget != null && spent > budget;
  const pct    = budget != null ? Math.min(1, spent / budget) : spent / Math.max(1, maxSpent);
  const filled = Math.min(8, Math.ceil(pct * 8));

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-sm ${over ? "bg-ink" : "hover:bg-cream/40"}`}>
      <span className={`font-sans text-sm w-24 shrink-0 truncate ${over ? "text-cream-soft" : "text-ink-soft"}`}>
        {name}
      </span>
      <div className="flex gap-[3px] flex-1 min-w-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-2 flex-1 rounded-[1px]" style={{
            backgroundColor: i < filled
              ? "#C5F03A"
              : over ? "rgba(250,247,236,0.1)" : "rgba(31,31,31,0.08)",
          }} />
        ))}
      </div>
      <div className="shrink-0 text-right min-w-[90px]">
        <span className={`font-mono text-sm ${over ? "text-cream-soft" : "text-ink"}`}>{eur(spent)}</span>
        {budget != null && (
          <span className="font-mono text-xs" style={{ color: over ? "rgba(250,247,236,0.35)" : "rgba(31,31,31,0.3)" }}>
            {" "}/ {eur(budget)}
          </span>
        )}
      </div>
      {over && <span className="font-pixel text-[9px] text-lime shrink-0 w-6">over</span>}
    </div>
  );
}

// ─── Transaction row ───────────────────────────────────────────────────────────

function TxRow({ label, category, amount, date }: { label: string; category: string; amount: number; date: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-ink/6 last:border-0">
      <div className="min-w-0 pr-3">
        <p className="font-sans text-sm text-ink truncate">{label}</p>
        <p className="font-mono text-[10px] text-ink-soft mt-0.5">{date} · {category}</p>
      </div>
      <span className="font-mono text-sm text-ink shrink-0">
        {amount > 0 ? "+" : ""}{eur(amount)}
      </span>
    </div>
  );
}

// ─── Assets vs debt card ───────────────────────────────────────────────────────

function AssetDebtCard({ assets, liabilities, netWorth, hidden }: {
  assets: number; liabilities: number; netWorth: number; hidden: boolean;
}) {
  const assetPct = assets + liabilities > 0 ? assets / (assets + liabilities) : 0;

  return (
    <Card>
      <h2 className="font-pixel text-ink text-xs tracking-wide mb-2">assets vs debt</h2>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-cream border-2 border-ink/15 rounded-sm p-2">
          <p className="font-sans text-[10px] text-ink-soft mb-0.5">assets</p>
          <p className="font-mono text-sm text-ink font-bold">{mask(eur(assets), hidden)}</p>
        </div>
        <div className="bg-ink rounded-sm p-2">
          <p className="font-sans text-[10px] text-cream-soft/50 mb-0.5">debt</p>
          <p className="font-mono text-sm text-cream-soft font-bold">{mask(eur(-liabilities), hidden)}</p>
        </div>
      </div>
      <div className="flex h-1.5 rounded-sm overflow-hidden gap-0.5 mb-1">
        <div className="bg-lime rounded-[2px]" style={{ width: `${assetPct * 100}%` }} />
        <div className="bg-ink/15 flex-1 rounded-[2px]" />
      </div>
      <div className="flex justify-between mb-2">
        <span className="font-mono text-[9px] text-ink-soft">{Math.round(assetPct * 100)}% assets</span>
        <span className="font-mono text-[9px] text-ink-soft">{Math.round((1 - assetPct) * 100)}% debt</span>
      </div>
      <div className="flex justify-between items-baseline border-t-2 border-ink/10 pt-2">
        <span className="font-sans text-xs text-ink-soft">net worth</span>
        <span className="font-mono text-sm text-ink">{mask(eur(netWorth), hidden)}</span>
      </div>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DashboardClient({ data }: { data: DashboardData }) {
  const { hidden, toggle } = useHideBalances();

  const {
    cycleStart, cycleEnd, daysLeft, daysTotal,
    dailyAllowance, spentToday,
    assets, liabilities, netWorth,
    daysSinceLastLog, loggedDays, dayLabels,
    recentTransactions, spending,
    upcomingBills, debtAccountCount, attackNext, nextDueBill,
    inboxCount,
  } = data;

  const cycleFilled = Math.min(8, Math.ceil(((daysTotal - daysLeft) / Math.max(1, daysTotal)) * 8));
  const pageBg = daysSinceLastLog >= 7 ? "#F0EBDD" : "#F4EFE3";
  const maxSpent = Math.max(...spending.map((s) => s.spent), 1);

  return (
    <div className="flex flex-col gap-3 p-3 min-h-screen" style={{ backgroundColor: pageBg }}>

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5 pt-0.5">
        <div>
          <h1 className="font-pixel text-ink text-2xl leading-none">overview</h1>
          <p className="font-mono text-xs text-ink-soft mt-0.5">{cycleStart} — {cycleEnd}</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="font-sans text-[10px] text-ink-soft mb-1">{daysLeft} days left</p>
            <Segs filled={cycleFilled} />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="w-8 h-8 grid place-items-center rounded-sm text-ink-soft border-2 border-ink/15 bg-surface hover:bg-lime hover:border-lime hover:text-ink shadow-[1px_1px_0_rgba(31,31,31,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer transition-none"
              title={hidden ? "Show balances" : "Hide balances"}
            >
              {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <Link
              href="/inbox"
              className="relative w-8 h-8 grid place-items-center rounded-sm text-ink-soft border-2 border-ink/15 bg-surface hover:bg-lime hover:border-lime hover:text-ink shadow-[1px_1px_0_rgba(31,31,31,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer transition-none"
            >
              <Bell size={14} />
              {inboxCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-lime rounded-full" />
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── TODAY hero ── */}
      <TodayHero dailyAllowance={dailyAllowance} spentToday={spentToday} hidden={hidden} />

      {/* ── Streak strip ── */}
      <StreakStrip daysSinceLastLog={daysSinceLastLog} loggedDays={loggedDays} dayLabels={dayLabels} />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">

        {/* Left col */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-pixel text-ink text-xs tracking-wide">recent transactions</h2>
              <PixelBtn href="/transactions">view all</PixelBtn>
            </div>
            {recentTransactions.length === 0 ? (
              <p className="font-sans text-xs text-ink-soft/50 py-4 text-center">no transactions yet this cycle</p>
            ) : (
              recentTransactions.map((tx, i) => <TxRow key={i} {...tx} />)
            )}
          </Card>
          <AssetDebtCard assets={assets} liabilities={liabilities} netWorth={netWorth} hidden={hidden} />
        </div>

        {/* Right col */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {liabilities > 0 && (
            <DebtHeroCard
              liabilities={liabilities}
              debtAccountCount={debtAccountCount}
              attackNext={attackNext}
              nextDueBill={nextDueBill}
              hidden={hidden}
            />
          )}
          <UpcomingBills bills={upcomingBills} hidden={hidden} />
          <Card>
            <h2 className="font-pixel text-ink text-xs tracking-wide mb-2">spending & budget</h2>
            {spending.length === 0 ? (
              <p className="font-sans text-xs text-ink-soft/50 py-4 text-center">no budgets configured yet</p>
            ) : (
              <div className="space-y-0">
                {spending.map((s) => (
                  <SpendingRow key={s.name} {...s} maxSpent={maxSpent} />
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Nah, type NahExpression } from "@/components/Nah";
import { Panel } from "@/components/ui/panel";
import { Segs } from "@/components/ui/segs";
import { PixelBtn } from "@/components/ui/pixel-btn";
import { PageHeader, iconBtnCls } from "@/components/layout/page-header";
import { useHideBalances } from "@/contexts/hide-balances";
import { useCountUp } from "@/hooks/use-count-up";
import { AnimateIn } from "@/components/ui/animate-in";
import { Eye } from "pixelarticons/react/Eye";
import { EyeOff } from "pixelarticons/react/EyeOff";
import { Bell } from "pixelarticons/react/Bell";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  description: string;
  category: string | null;
  date: string;
  amount: number;
}

interface SpendingRow {
  name: string;
  spent: number;
  budget: number | null;
}

interface DebtAccount {
  name: string;
  balance: number;
}

interface OverviewProps {
  cycleStart: string;
  cycleEnd: string;
  daysLeft: number;
  daysTotal: number;
  dailyAllowance: number;
  spentToday: number;
  daysSinceLastLog: number;
  loggedDays: boolean[];
  recentTransactions: Transaction[];
  spendingRows: SpendingRow[];
  maxSpent: number;
  totalAssets: number;
  totalLiabilities: number;
  debtAccounts: DebtAccount[];
  freePool: number;
  salary: number;
  plannedExpenses: number;
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

function mask(v: string, hidden: boolean) {
  return hidden ? "••••" : v;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** Streak state: Nah expression + optional microcopy from days since last log */
function streakState(days: number): { expression: NahExpression; copy: string | null; lime: boolean } {
  if (days === 0) return { expression: "default",      copy: "logged today.",                    lime: true  };
  if (days === 1) return { expression: "default",      copy: "logged yesterday.",                lime: false };
  if (days === 2) return { expression: "skeptical",    copy: "haven't seen you log since yesterday.", lime: false };
  if (days <= 4)  return { expression: "disappointed", copy: `${days} days. you're slipping.`,   lime: false };
  if (days <= 6)  return { expression: "disappointed", copy: "we both know what's happening.",   lime: false };
  return               { expression: "disappointed",   copy: "...nah.",                          lime: false };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TodayHero({
  dailyAllowance, spentToday, hidden,
}: { dailyAllowance: number; spentToday: number; hidden: boolean }) {
  const safe      = dailyAllowance > 0;
  const pct       = safe ? spentToday / dailyAllowance : 0;
  const remaining = Math.max(0, dailyAllowance - spentToday);

  // Count-up animations — numbers sweep from 0 to target on mount.
  const animRemaining  = useCountUp(remaining,      { duration: 900 });
  const animSpentToday = useCountUp(spentToday,     { duration: 750, delay: 100 });
  const animAllowance  = useCountUp(dailyAllowance, { duration: 750, delay: 60  });

  // Lime segs = remaining (fuel gauge — depletes as you spend)
  const remainingSegs = Math.max(0, Math.ceil((1 - Math.min(pct, 1)) * 8));

  const nahExpression: NahExpression =
    !safe || pct > 1    ? "disappointed" :
    pct >= 0.5          ? "skeptical"    :
                          "default";

  const nahCopy =
    nahExpression === "skeptical"    ? "easy."         :
    nahExpression === "disappointed" ? "over already?" :
    null;

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <Panel className="px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-pixel text-ink text-sm tracking-widest">today</h2>
            <span className="font-mono text-xs text-ink-soft">{dateLabel}</span>
          </div>

          <p className="font-mono font-bold text-ink leading-none" style={{ fontSize: 64 }}>
            {mask(eur(animRemaining, 2), hidden)}
          </p>
          <p className="font-sans text-sm text-ink-soft mt-1 mb-3">remaining today</p>

          {/* Segs animate in after the number is mostly done */}
          <Segs filled={remainingSegs} animate animateDelay={650} />

          <div className="flex gap-6 mt-2">
            <div>
              <p className="font-sans text-[10px] text-ink-soft">already spent</p>
              <p className="font-mono text-sm text-ink mt-0.5">
                {mask(eur(animSpentToday, 2), hidden)}
              </p>
            </div>
            <div>
              <p className="font-sans text-[10px] text-ink-soft">daily allowance</p>
              <p className="font-mono text-sm text-ink mt-0.5">
                {mask(eur(animAllowance, 2), hidden)}
              </p>
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
    </Panel>
  );
}

function StreakStrip({ daysSinceLastLog, loggedDays }: { daysSinceLastLog: number; loggedDays: boolean[] }) {
  const state = streakState(daysSinceLastLog);

  // Day-of-month labels for last 7 days
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.getDate().toString();
  });

  return (
    <Panel className="px-4 py-2 flex items-center justify-between gap-6">
      <span className="font-mono text-xs text-ink-soft shrink-0">
        {daysSinceLastLog === 0 ? "logged today" :
         daysSinceLastLog === 1 ? "logged yesterday" :
         `last logged ${daysSinceLastLog}d ago`}
      </span>

      <div className="flex items-end gap-2">
        {loggedDays.map((logged, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{
                backgroundColor: logged ? "#C5F03A" : "transparent",
                borderColor:     logged ? "#C5F03A" : "rgba(31,31,31,0.18)",
                // Dots pop in staggered — filled ones a beat after empty
                animation: "slide-up-fade 0.3s ease both",
                animationDelay: `${i * 40 + (logged ? 20 : 0)}ms`,
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
    </Panel>
  );
}

function DebtCard({
  totalLiabilities, debtAccounts, hidden,
}: { totalLiabilities: number; debtAccounts: DebtAccount[]; hidden: boolean }) {
  const animLiabilities = useCountUp(totalLiabilities, { duration: 800, delay: 220 });
  const attackNext = debtAccounts[0] ?? null;

  return (
    <div className="bg-ink border-2 border-ink rounded-md px-4 py-3">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="font-sans text-[10px] text-cream-soft/45 mb-0.5">total debt</p>
          <p className="font-mono text-xl text-cream-soft font-bold leading-none">
            {mask(eur(animLiabilities), hidden)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-sans text-[10px] text-cream-soft/45 mb-0.5">accounts</p>
          <p className="font-mono text-lg text-lime font-bold leading-none">
            {debtAccounts.length}
          </p>
        </div>
      </div>

      {attackNext && (
        <div className="flex items-end justify-between pt-2 border-t border-white/10">
          <div>
            <p className="font-sans text-[10px] text-cream-soft/40 mb-0.5">attack next</p>
            <p className="font-pixel text-cream-soft text-xs">{attackNext.name}</p>
            <p className="font-mono text-[10px] text-cream-soft/60">
              {mask(eur(Math.abs(attackNext.balance)), hidden)} left
            </p>
          </div>
          <Nah expression="approving" size={64} />
        </div>
      )}
    </div>
  );
}

function SpendingCard({
  spendingRows, maxSpent, hidden,
}: { spendingRows: SpendingRow[]; maxSpent: number; hidden: boolean }) {
  return (
    <Panel>
      <h2 className="font-pixel text-ink text-xs tracking-wide mb-2">spending & budget</h2>
      <div>
        {spendingRows.length === 0 ? (
          <p className="font-sans text-sm text-ink-soft italic py-2">no expenses yet this cycle.</p>
        ) : (
          spendingRows.map(({ name, spent, budget }, rowIdx) => {
            const over   = budget != null && spent > budget;
            const pct    = budget != null ? Math.min(1, spent / budget) : spent / maxSpent;
            const filled = Math.min(8, Math.ceil(pct * 8));

            return (
              <div
                key={name}
                className={`flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-sm ${
                  over ? "bg-ink" : "hover:bg-cream/40"
                }`}
              >
                <span
                  className={`font-sans text-sm w-24 shrink-0 truncate ${
                    over ? "text-cream-soft" : "text-ink-soft"
                  }`}
                >
                  {name}
                </span>

                {/* Segs with staggered animate — each row starts 90ms after the previous */}
                <Segs
                  filled={filled}
                  dark={over}
                  animate
                  animateDelay={rowIdx * 90}
                  className="flex-1 min-w-0"
                />

                <div className="shrink-0 text-right min-w-[90px]">
                  <span className={`font-mono text-sm ${over ? "text-cream-soft" : "text-ink"}`}>
                    {mask(eur(spent), hidden)}
                  </span>
                  {budget != null && (
                    <span
                      className="font-mono text-xs"
                      style={{
                        color: over
                          ? "rgba(250,247,236,0.35)"
                          : "rgba(31,31,31,0.3)",
                      }}
                    >
                      {" "}/ {mask(eur(budget), hidden)}
                    </span>
                  )}
                </div>

                {over && (
                  <span className="font-pixel text-[9px] text-lime shrink-0 w-6">over</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}

function AssetDebtCard({
  totalAssets, totalLiabilities, hidden,
}: { totalAssets: number; totalLiabilities: number; hidden: boolean }) {
  const animAssets = useCountUp(totalAssets,      { duration: 900, delay: 180 });
  const animDebt   = useCountUp(totalLiabilities, { duration: 900, delay: 240 });
  const netWorth   = totalAssets - totalLiabilities;
  const animNet    = useCountUp(netWorth,          { duration: 900, delay: 300 });

  const assetPct  = totalAssets + totalLiabilities > 0
    ? totalAssets / (totalAssets + totalLiabilities)
    : 0.5;

  return (
    <Panel>
      <h2 className="font-pixel text-ink text-xs tracking-wide mb-2">assets vs debt</h2>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-cream border-2 border-ink/15 rounded-sm p-2">
          <p className="font-sans text-[10px] text-ink-soft mb-0.5">assets</p>
          <p className="font-mono text-sm text-ink font-bold">
            {mask(eur(animAssets), hidden)}
          </p>
        </div>
        <div className="bg-ink rounded-sm p-2">
          <p className="font-sans text-[10px] text-cream-soft/50 mb-0.5">debt</p>
          <p className="font-mono text-sm text-cream-soft font-bold">
            {mask(eur(-animDebt), hidden)}
          </p>
        </div>
      </div>

      <div className="flex h-1.5 rounded-sm overflow-hidden gap-0.5 mb-1">
        <div
          className="bg-lime rounded-[2px]"
          style={{
            width: `${assetPct * 100}%`,
            animation: "slide-up-fade 0.6s ease both",
            animationDelay: "300ms",
          }}
        />
        <div className="bg-ink/15 flex-1 rounded-[2px]" />
      </div>
      <div className="flex justify-between mb-2">
        <span className="font-mono text-[9px] text-ink-soft">
          {Math.round(assetPct * 100)}% assets
        </span>
        <span className="font-mono text-[9px] text-ink-soft">
          {Math.round((1 - assetPct) * 100)}% debt
        </span>
      </div>

      <div className="flex justify-between items-baseline border-t-2 border-ink/10 pt-2">
        <span className="font-sans text-xs text-ink-soft">net worth</span>
        <span className="font-mono text-sm text-ink font-bold">
          {mask(eur(animNet), hidden)}
        </span>
      </div>
    </Panel>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function OverviewClient({
  cycleStart, cycleEnd,
  daysLeft, daysTotal,
  dailyAllowance, spentToday,
  daysSinceLastLog, loggedDays,
  recentTransactions,
  spendingRows, maxSpent,
  totalAssets, totalLiabilities, debtAccounts,
  freePool, salary, plannedExpenses,
}: OverviewProps) {
  const { hidden, toggle } = useHideBalances();

  const cycleFilled = Math.ceil(((daysTotal - daysLeft) / daysTotal) * 8);

  // Background shifts cooler when streak is broken 7+ days
  const pageBg = daysSinceLastLog >= 7 ? "#F0EBDD" : "#F4EFE3";

  return (
    <div className="min-h-screen flex flex-col gap-3 p-4" style={{ backgroundColor: pageBg }}>

      {/* ── Page header ── */}
      <PageHeader
        title="overview"
        meta={`${fmtDateShort(cycleStart)} — ${fmtDate(cycleEnd)}`}
        action={
          <div className="flex items-center gap-1.5">
            <button onClick={toggle} className={iconBtnCls} title={hidden ? "Show balances" : "Hide balances"}>
              {hidden ? <EyeOff className="size-[14px]" /> : <Eye className="size-[14px]" />}
            </button>
            <Link href="/inbox" className={iconBtnCls} title="Inbox">
              <Bell className="size-[14px]" />
            </Link>
          </div>
        }
        contextBar={
          <div className="flex items-center gap-3">
            <span className="font-sans text-[10px] text-ink-soft">{daysLeft} days left</span>
            <Segs filled={cycleFilled} animate animateDelay={0} className="w-24" />
          </div>
        }
      />

      {/* ── TODAY hero — first card in ── */}
      <AnimateIn>
        <TodayHero
          dailyAllowance={dailyAllowance}
          spentToday={spentToday}
          hidden={hidden}
        />
      </AnimateIn>

      {/* ── Streak strip ── */}
      <AnimateIn delay={80}>
        <StreakStrip daysSinceLastLog={daysSinceLastLog} loggedDays={loggedDays} />
      </AnimateIn>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">

        {/* ── Left col ── */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Recent transactions */}
          <AnimateIn delay={160}>
            <Panel>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-pixel text-ink text-xs tracking-wide">recent transactions</h2>
                <Link href="/transactions">
                  <PixelBtn>view all</PixelBtn>
                </Link>
              </div>
              {recentTransactions.length === 0 ? (
                <p className="font-sans text-sm text-ink-soft italic py-2">no transactions yet.</p>
              ) : (
                recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between py-2 border-b border-ink/6 last:border-0"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-sans text-sm text-ink truncate">{tx.description}</p>
                      <p className="font-mono text-[10px] text-ink-soft mt-0.5">
                        {String(tx.date).slice(0, 10)}
                        {tx.category ? ` · ${tx.category}` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-ink shrink-0">
                      {mask(
                        `${tx.amount > 0 ? "+" : ""}${eur(tx.amount)}`,
                        hidden,
                      )}
                    </span>
                  </div>
                ))
              )}
            </Panel>
          </AnimateIn>

          {/* Assets vs debt */}
          <AnimateIn delay={260}>
            <AssetDebtCard
              totalAssets={totalAssets}
              totalLiabilities={totalLiabilities}
              hidden={hidden}
            />
          </AnimateIn>
        </div>

        {/* ── Right col ── */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Debt slab */}
          <AnimateIn delay={210}>
            <DebtCard
              totalLiabilities={totalLiabilities}
              debtAccounts={debtAccounts}
              hidden={hidden}
            />
          </AnimateIn>

          {/* Spending & budget */}
          <AnimateIn delay={310}>
            <SpendingCard
              spendingRows={spendingRows}
              maxSpent={maxSpent}
              hidden={hidden}
            />
          </AnimateIn>
        </div>
      </div>
    </div>
  );
}

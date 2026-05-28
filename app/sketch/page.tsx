"use client";

import { useState } from "react";
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Tag,
  Lightbulb, Wallet, Download, Bell, Eye, EyeOff,
  ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { Nah, type NahExpression } from "@/components/Nah";

// ─── Data ──────────────────────────────────────────────────────────────────────

const NAV: { label: string; Icon: LucideIcon; active?: boolean }[] = [
  { label: "overview",        Icon: LayoutDashboard, active: true },
  { label: "transactions",    Icon: ArrowLeftRight },
  { label: "forecast",        Icon: TrendingUp },
  { label: "categories",      Icon: Tag },
  { label: "advisor",         Icon: Lightbulb },
  { label: "manage accounts", Icon: Wallet },
  { label: "import data",     Icon: Download },
];

const ACCOUNTS = [
  { name: "N26",           balance:  1420.30 },
  { name: "Nubank",        balance:   328.08 },
  { name: "Revolut",       balance:   869.15 },
  { name: "Pay Pal",       balance:     0.00 },
  { name: "Easy Bank",     balance: -1421.94 },
  { name: "Nubank Card",   balance:  -722.78 },
  { name: "Gui Loan",      balance:  -305.32 },
  { name: "Paul Loan",     balance:  -900.00 },
  { name: "Revolut Loan",  balance: -7187.21 },
  { name: "TF Bank",       balance: -4963.33 },
];

const ACCOUNT_GROUPS = [
  {
    label: "assets",
    accounts: [
      { name: "N26",     balance:  1420.30 },
      { name: "Nubank",  balance:   328.08 },
      { name: "Revolut", balance:   869.15 },
      { name: "Pay Pal", balance:     0.00 },
    ],
  },
  {
    label: "credit",
    accounts: [
      { name: "Easy Bank",   balance: -1421.94 },
      { name: "Nubank Card", balance:  -722.78 },
    ],
  },
  {
    label: "loans",
    accounts: [
      { name: "Gui Loan",     balance:  -305.32 },
      { name: "Paul Loan",    balance:  -900.00 },
      { name: "Revolut Loan", balance: -7187.21 },
      { name: "TF Bank",      balance: -4963.33 },
    ],
  },
];

const TRANSACTIONS = [
  { label: "Repayment",                   category: "Transfer", amount:   330, date: "Apr 29" },
  { label: "Netting com contas passadas", category: "Transfer", amount:   130, date: "Apr 29" },
  { label: "Bella · Massages + Tips",     category: "Shopping", amount:  -103, date: "Apr 29" },
  { label: "Ozempic subscription",        category: "Health",   amount:  -535, date: "Apr 28" },
  { label: "Rent — April",               category: "Housing",  amount: -1074, date: "Apr 27" },
];

const SPENDING = [
  { name: "Rent",          spent: 1074, budget: 1074 },
  { name: "Shopping",      spent:  795, budget: null },
  { name: "Ozempic",       spent:  535, budget:  550 },
  { name: "Utilities",     spent:  138, budget: null },
  { name: "Gym",           spent:   45, budget:   40 },
  { name: "Groceries",     spent:   42, budget:  300 },
  { name: "Subscriptions", spent:   41, budget: null },
  { name: "Take out",      spent:   30, budget:  200 },
];

// ─── TODAY / streak data ───────────────────────────────────────────────────────
// TODO: wire SPENT_TODAY and DAYS_SINCE_LAST_LOG to real transaction data

const DAILY_ALLOWANCE   = 46.45;
const SPENT_TODAY       = 30.20; // 65% → skeptical expression

const DAYS_SINCE_LAST_LOG: number = 1; // logged yesterday (Apr 29) — TODO: wire to real timestamps
// Last 7 days: Apr 24 → Apr 30. True = logged that day.
const LOGGED_DAYS: boolean[] = [false, false, false, true, true, true, false];
const DAY_LABELS = ["24", "25", "26", "27", "28", "29", "30"];

// ─── Upcoming bills ────────────────────────────────────────────────────────────
// TODO: wire to real recurring bills / scheduled transactions
const UPCOMING_BILLS = [
  { name: "Revolut Loan", amount:  200, daysUntil: 1  },
  { name: "Gym",          amount:   40, daysUntil: 5  },
  { name: "Netflix",      amount:   18, daysUntil: 8  },
  { name: "TF Bank",      amount:  350, daysUntil: 10 },
];

// ─── Derived constants ─────────────────────────────────────────────────────────
const DAYS_LEFT     = 26;
const DAYS_TOTAL    = 29;
const ORIGINAL_DEBT = 20_000;
const ASSETS        = ACCOUNTS.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
const LIABILITIES   = Math.abs(ACCOUNTS.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
const NET_WORTH     = ACCOUNTS.reduce((s, a) => s + a.balance, 0);
const MAX_SPENT     = Math.max(...SPENDING.map(s => s.spent));

// ─── Helpers ───────────────────────────────────────────────────────────────────

function eur(n: number, dec = 0) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  }).format(n);
}

const mask = (v: string, h: boolean) => h ? "••••" : v;

// Escalation ladder: days since last log → Nah state + microcopy
function streakState(days: number): { expression: NahExpression; copy: string | null; lime: boolean } {
  if (days === 0) return { expression: "default",      copy: "logged today.",                    lime: true  };
  if (days === 1) return { expression: "default",      copy: "logged yesterday.",                lime: false };
  if (days === 2) return { expression: "skeptical",    copy: "haven't seen you log since yesterday.", lime: false };
  if (days <= 4)  return { expression: "disappointed", copy: `${days} days. you're slipping.`,   lime: false };
  if (days <= 6)  return { expression: "disappointed", copy: "we both know what's happening.",   lime: false };
  return               { expression: "disappointed",   copy: "...nah.",                          lime: false };
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function Segs({ filled, total = 8, dark = false }: { filled: number; total?: number; dark?: boolean }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-2 flex-1 rounded-[2px]" style={{
          backgroundColor: i < filled
            ? "#C5F03A"
            : dark ? "rgba(250,247,236,0.1)" : "rgba(31,31,31,0.1)",
        }} />
      ))}
    </div>
  );
}

// Retro pixel button — font-pixel, hard shadow, press-down on active
function PixelBtn({
  children, onClick, className = "",
}: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`font-pixel text-[10px] border-2 border-ink rounded-sm px-2.5 py-1 bg-surface text-ink
        shadow-[2px_2px_0_#1F1F1F] hover:bg-lime hover:border-lime
        hover:shadow-[1px_1px_0_#1F1F1F] hover:translate-x-[1px] hover:translate-y-[1px]
        active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
        cursor-pointer transition-none select-none ${className}`}
    >
      {children}
    </button>
  );
}

// White card shell with retro offset shadow — border-2 border-ink everywhere
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border-2 border-ink rounded-md p-4 shadow-[2px_2px_0_rgba(31,31,31,0.09)] ${className}`}>
      {children}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed, onToggle, nahExpression,
  headerMicrocopy,
  footerReaction = "we're working on it.",
}: {
  collapsed: boolean;
  onToggle: () => void;
  nahExpression: NahExpression;
  headerMicrocopy?: string;
  footerReaction?: string;
}) {
  return (
    <aside
      className="hidden md:flex shrink-0 bg-ink rounded-2xl flex-col overflow-hidden transition-all duration-300"
      style={{ width: collapsed ? 56 : 208 }}
    >
      {/* ── Brand header — collapse lives here ── */}
      {collapsed ? (
        // Collapsed: whole header is the expand button
        <button
          onClick={onToggle}
          className="flex items-center justify-center py-3 border-b border-white/8 shrink-0 hover:bg-white/5 cursor-pointer transition-none"
        >
          <div className="nah-idle">
            <Nah expression={nahExpression} size={28} />
          </div>
        </button>
      ) : (
        // Expanded: Nah + wordmark + collapse chevron on right
        <div className="flex items-center gap-2.5 px-3 py-3 border-b border-white/8 shrink-0">
          <div className="nah-idle shrink-0">
            <Nah expression={nahExpression} size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-pixel text-cream-soft text-xl leading-none tracking-wide block">Nah</span>
            {headerMicrocopy && (
              <span className="font-sans text-[10px] text-cream-soft/40 leading-none mt-0.5 block truncate">
                {headerMicrocopy}
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="shrink-0 p-1 text-cream-soft/30 hover:text-cream-soft/70 cursor-pointer transition-none"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="px-0 pt-2 pb-3 flex-1 overflow-y-auto">
        {!collapsed && (
          <p className="font-pixel text-[10px] text-cream-soft/35 px-3 mb-1.5">menu</p>
        )}
        <ul className="space-y-px">
          {NAV.map(({ label, Icon, active }) => (
            <li key={label}>
              <div
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2.5 pl-3 pr-2 py-1.5 cursor-pointer border-l-2 transition-none ${
                  active
                    ? "border-lime bg-white/8 text-cream-soft"
                    : "border-transparent text-cream-soft/45 hover:border-cream-soft/25 hover:bg-white/5 hover:text-cream-soft/70"
                }`}
              >
                <Icon size={13} className="shrink-0" />
                {!collapsed && (
                  <span
                    className={`font-pixel text-[11px] flex-1 truncate leading-none ${
                      active ? "translate-x-0.5" : ""
                    }`}
                  >
                    {label}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* ── Accounts — grouped ── */}
        {!collapsed && (
          <div className="mt-2">
            {ACCOUNT_GROUPS.map((group, gi) => (
              <div key={group.label}>
                <div className={`border-t-2 border-cream-soft/10 mx-3 mb-1 pt-2 ${gi === 0 ? "mt-2" : "mt-3"}`}>
                  <p className="font-pixel text-[10px] text-cream-soft/35">{group.label}</p>
                </div>
                <ul className="space-y-px">
                  {group.accounts.map(acc => (
                    <li
                      key={acc.name}
                      className="flex items-center justify-between pl-3 pr-2 py-1 hover:bg-white/5 cursor-pointer"
                    >
                      <span className="font-sans text-[11px] text-cream-soft/50 truncate pr-1">{acc.name}</span>
                      <span
                        className="font-mono text-[10px] shrink-0"
                        style={{ color: acc.balance > 0 ? "#C5F03A" : "rgba(250,247,236,0.40)" }}
                      >
                        {eur(acc.balance)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* ── Totals — right below accounts ── */}
            <div className="mx-3 mt-3 pt-3 border-t-2 border-cream-soft/10">
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-[10px] text-cream-soft/40">assets</span>
                  <span className="font-mono text-[10px] text-lime">{eur(ASSETS)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-[10px] text-cream-soft/40">debt</span>
                  <span className="font-mono text-[10px] text-cream-soft/55">{eur(-LIABILITIES)}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-white/10 pt-1">
                  <span className="font-sans text-[10px] text-cream-soft/60">net worth</span>
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{ color: NET_WORTH >= 0 ? "#C5F03A" : "rgba(250,247,236,0.75)" }}
                  >
                    {eur(NET_WORTH)}
                  </span>
                </div>
              </div>
              {/* Nah + reaction */}
              <div className="flex items-center gap-2">
                <Nah expression={nahExpression} size={32} />
                {footerReaction && (
                  <span className="font-sans text-[10px] text-cream-soft/40 leading-snug">{footerReaction}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}

// ─── TODAY hero ────────────────────────────────────────────────────────────────

function TodayHero({ hidden }: { hidden: boolean }) {
  const pct       = SPENT_TODAY / DAILY_ALLOWANCE;
  const remaining = Math.max(0, DAILY_ALLOWANCE - SPENT_TODAY);

  // Lime segs = remaining allowance (fuel gauge — depletes as you spend)
  const remainingSegs = Math.max(0, Math.ceil((1 - pct) * 8));

  const nahExpression: NahExpression =
    pct > 1    ? "disappointed" :
    pct >= 0.5 ? "skeptical"   :
                 "default";

  const nahCopy =
    nahExpression === "skeptical"   ? "easy."         :
    nahExpression === "disappointed"? "over already?" :
    null;

  return (
    <Card className="px-6 py-4">
      <div className="flex items-center gap-6">
        {/* Left: all content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-pixel text-ink text-sm tracking-widest">today</h2>
            <span className="font-mono text-xs text-ink-soft">April 30, 2026</span>
          </div>

          {/* Hero number */}
          <p className="font-mono font-bold text-ink leading-none" style={{ fontSize: 64 }}>
            {mask(eur(remaining, 2), hidden)}
          </p>
          <p className="font-sans text-sm text-ink-soft mt-1 mb-3">remaining today</p>

          {/* Fuel gauge — lime depletes as you spend */}
          <Segs filled={remainingSegs} />

          {/* Stats row */}
          <div className="flex gap-6 mt-2">
            <div>
              <p className="font-sans text-[10px] text-ink-soft">already spent</p>
              <p className="font-mono text-sm text-ink mt-0.5">{mask(eur(SPENT_TODAY, 2), hidden)}</p>
            </div>
            <div>
              <p className="font-sans text-[10px] text-ink-soft">daily allowance</p>
              <p className="font-mono text-sm text-ink mt-0.5">{mask(eur(DAILY_ALLOWANCE, 2), hidden)}</p>
            </div>
          </div>
        </div>

        {/* Right: Nah at 96px — full-presence size */}
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

function StreakStrip() {
  const state = streakState(DAYS_SINCE_LAST_LOG);

  return (
    <Card className="px-4 py-2 flex items-center justify-between gap-6">
      {/* Left: last logged label */}
      <span className="font-mono text-xs text-ink-soft shrink-0">
        {DAYS_SINCE_LAST_LOG === 0 ? "logged today" :
         DAYS_SINCE_LAST_LOG === 1 ? "logged yesterday" :
         `last logged ${DAYS_SINCE_LAST_LOG}d ago`}
      </span>

      {/* Middle: 7-day dot grid */}
      <div className="flex items-end gap-2">
        {LOGGED_DAYS.map((logged, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{
                backgroundColor: logged ? "#C5F03A" : "transparent",
                borderColor:     logged ? "#C5F03A" : "rgba(31,31,31,0.18)",
              }}
            />
            <span className="font-mono text-[8px] text-ink-soft/40">{DAY_LABELS[i]}</span>
          </div>
        ))}
      </div>

      {/* Right: Nah 32px + microcopy */}
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

// ─── Debt hero card (bg-ink, shorter) ─────────────────────────────────────────

function DebtHeroCard({ hidden }: { hidden: boolean }) {
  const paidOff = ORIGINAL_DEBT - LIABILITIES;
  const pct     = paidOff / ORIGINAL_DEBT;
  const filled  = Math.min(8, Math.ceil(pct * 8));

  return (
    <div className="bg-ink border-2 border-ink rounded-md px-4 py-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="font-sans text-[10px] text-cream-soft/45 mb-0.5">total debt</p>
          <p className="font-mono text-xl text-cream-soft font-bold leading-none">
            {mask(eur(LIABILITIES), hidden)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-sans text-[10px] text-cream-soft/45 mb-0.5">freedom in</p>
          <p className="font-mono text-lg text-lime font-bold leading-none">
            18 <span className="text-xs font-normal text-cream-soft/40">mo</span>
          </p>
        </div>
      </div>

      {/* Thermometer */}
      <Segs filled={filled} dark />
      <div className="flex justify-between mt-0.5 mb-2">
        <span className="font-mono text-[9px] text-cream-soft/60">{mask(eur(paidOff), hidden)} paid off</span>
        <span className="font-mono text-[9px] text-cream-soft/60">{Math.round(pct * 100)}% done</span>
      </div>

      {/* Compact footer — attack next + next due + Nah approving */}
      <div className="flex items-end justify-between pt-2 border-t border-white/10">
        <div className="flex gap-5">
          <div>
            <p className="font-sans text-[10px] text-cream-soft/40 mb-0.5">attack next</p>
            <p className="font-pixel text-cream-soft text-xs">Gui Loan</p>
            <p className="font-mono text-[10px] text-cream-soft/55">{mask(eur(305), hidden)} left</p>
          </div>
          <div>
            <p className="font-sans text-[10px] text-cream-soft/40 mb-0.5">next due</p>
            <p className="font-pixel text-cream-soft text-xs">May 01</p>
            <p className="font-mono text-[10px] text-cream-soft/55">Revolut · {mask(eur(200), hidden)}</p>
          </div>
        </div>
        {/* 96px — matches TODAY hero Nah for visual consistency */}
        <Nah expression="approving" size={96} />
      </div>
    </div>
  );
}

// ─── Upcoming bills ────────────────────────────────────────────────────────────

function UpcomingBills({ hidden }: { hidden: boolean }) {
  const total = UPCOMING_BILLS.reduce((s, b) => s + b.amount, 0);

  function pillStyle(days: number) {
    if (days <= 1) return { bg: "#C5F03A", border: "#C5F03A", color: "#1F1F1F" };
    if (days <= 5) return { bg: "transparent", border: "#1F1F1F", color: "#1F1F1F" };
    return             { bg: "transparent", border: "rgba(31,31,31,0.3)", color: "rgba(31,31,31,0.45)" };
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-pixel text-ink text-xs tracking-wide">upcoming</h2>
        <span className="font-mono text-[10px] text-ink-soft">next 14 days</span>
      </div>

      <div className="space-y-1.5">
        {UPCOMING_BILLS.map(bill => {
          const s = pillStyle(bill.daysUntil);
          return (
            <div key={bill.name} className="flex items-center gap-3">
              {/* Day-counter pill */}
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-full border-2 shrink-0 whitespace-nowrap"
                style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}
              >
                in {bill.daysUntil}
              </span>
              {/* Name */}
              <span className="font-sans text-sm text-ink flex-1 truncate">{bill.name}</span>
              {/* Amount */}
              <span className="font-mono text-sm text-ink shrink-0">
                {mask(eur(bill.amount), hidden)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer — total committed */}
      <div className="mt-2 pt-2 border-t-2 border-ink flex justify-between items-baseline">
        <span className="font-sans text-xs text-ink-soft">total committed</span>
        <span className="font-mono text-sm text-ink font-bold">
          {mask(eur(total), hidden)}
        </span>
      </div>
    </Card>
  );
}

// ─── Spending row (list format, no radar) ──────────────────────────────────────

function SpendingRow({ name, spent, budget }: { name: string; spent: number; budget: number | null }) {
  const over   = budget != null && spent > budget;
  const pct    = budget != null ? Math.min(1, spent / budget) : spent / MAX_SPENT;
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
        <span className={`font-mono text-sm ${over ? "text-cream-soft" : "text-ink"}`}>
          {eur(spent)}
        </span>
        {budget != null && (
          <span className="font-mono text-xs" style={{ color: over ? "rgba(250,247,236,0.35)" : "rgba(31,31,31,0.3)" }}>
            {" "}/ {eur(budget)}
          </span>
        )}
      </div>
      {over && (
        <span className="font-pixel text-[9px] text-lime shrink-0 w-6">over</span>
      )}
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

// ─── Asset / debt summary ──────────────────────────────────────────────────────

function AssetDebtCard({ hidden }: { hidden: boolean }) {
  const assetPct = ASSETS / (ASSETS + LIABILITIES);
  return (
    <Card>
      <h2 className="font-pixel text-ink text-xs tracking-wide mb-2">assets vs debt</h2>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-cream border-2 border-ink/15 rounded-sm p-2">
          <p className="font-sans text-[10px] text-ink-soft mb-0.5">assets</p>
          <p className="font-mono text-sm text-ink font-bold">{mask(eur(ASSETS), hidden)}</p>
        </div>
        <div className="bg-ink rounded-sm p-2">
          <p className="font-sans text-[10px] text-cream-soft/50 mb-0.5">debt</p>
          <p className="font-mono text-sm text-cream-soft font-bold">{mask(eur(-LIABILITIES), hidden)}</p>
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
        <span className="font-mono text-sm text-ink">{mask(eur(NET_WORTH), hidden)}</span>
      </div>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SketchPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden]       = useState(false);

  const cycleFilled = Math.ceil(((DAYS_TOTAL - DAYS_LEFT) / DAYS_TOTAL) * 8);

  // Background shifts cooler when streak is broken 7+ days
  const pageBg = DAYS_SINCE_LAST_LOG >= 7 ? "#F0EBDD" : "#F4EFE3";

  // Sidebar Nah swaps to disappointed at 5+ days without logging
  const sidebarNah: NahExpression = DAYS_SINCE_LAST_LOG >= 5 ? "disappointed" : "default";

  return (
    <div className="min-h-screen flex gap-3 p-3" style={{ backgroundColor: pageBg }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        nahExpression={sidebarNah}
        footerReaction="we're working on it."
      />

      <div className="flex-1 flex flex-col gap-3 min-w-0">

        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-0.5 pt-0.5">
          <div>
            <h1 className="font-pixel text-ink text-2xl leading-none">overview</h1>
            <p className="font-mono text-xs text-ink-soft mt-0.5">Apr 27 — May 25, 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="font-sans text-[10px] text-ink-soft mb-1">{DAYS_LEFT} days left</p>
              <Segs filled={cycleFilled} />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHidden(h => !h)}
                className="w-8 h-8 grid place-items-center rounded-sm text-ink-soft border-2 border-ink/15 bg-surface hover:bg-lime hover:border-lime hover:text-ink shadow-[1px_1px_0_rgba(31,31,31,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer transition-none"
                title={hidden ? "Show balances" : "Hide balances"}
              >
                {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button className="relative w-8 h-8 grid place-items-center rounded-sm text-ink-soft border-2 border-ink/15 bg-surface hover:bg-lime hover:border-lime hover:text-ink shadow-[1px_1px_0_rgba(31,31,31,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer transition-none">
                <Bell size={14} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-lime rounded-full" />
              </button>
            </div>
          </div>
        </div>

        {/* ── TODAY hero — full width ── */}
        <TodayHero hidden={hidden} />

        {/* ── Streak strip — full width ── */}
        <StreakStrip />

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">

          {/* ── Left col ── */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* Transactions stretches to fill */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-pixel text-ink text-xs tracking-wide">recent transactions</h2>
                <PixelBtn>view all</PixelBtn>
              </div>
              {TRANSACTIONS.map(tx => <TxRow key={tx.label} {...tx} />)}
            </Card>
            <AssetDebtCard hidden={hidden} />
          </div>

          {/* ── Right col ── */}
          <div className="lg:col-span-3 flex flex-col gap-3">

            {/* Debt slab — shorter, no longer hero */}
            <DebtHeroCard hidden={hidden} />

            {/* Upcoming bills */}
            <UpcomingBills hidden={hidden} />

            {/* Spending & budget — list rows, no radar */}
            <Card>
              <h2 className="font-pixel text-ink text-xs tracking-wide mb-2">spending & budget</h2>
              <div className="space-y-0">
                {SPENDING.map(s => <SpendingRow key={s.name} {...s} />)}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

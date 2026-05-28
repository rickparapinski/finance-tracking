"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  UploadCloud,
  Settings,
  LayoutList,
  TrendingUp,
  LogOut,
  Sparkles,
  Bell,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { useHideBalances } from "@/contexts/hide-balances";
import { Nah, type NahExpression } from "@/components/Nah";

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface SidebarAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  color: string;
}

interface AppSidebarProps {
  accounts: SidebarAccount[];
  inboxCount?: number;
  collapsed: boolean;
  onCollapse: () => void;
  /** Days since the last logged transaction ΓÇö drives Nah escalation */
  daysSinceLastLog?: number;
  /** Precomputed net-worth reaction copy. Stub until trend logic is wired. */
  footerReaction?: string;
}

// ΓöÇΓöÇΓöÇ Nav items ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const NAV = [
  { label: "overview", href: "/", Icon: LayoutDashboard },
  { label: "transactions", href: "/transactions", Icon: ArrowRightLeft },
  { label: "forecast", href: "/forecast", Icon: TrendingUp },
  { label: "categories", href: "/categories", Icon: LayoutList },
  { label: "advisor", href: "/advisor", Icon: Sparkles },
  { label: "manage accounts", href: "/accounts", Icon: Wallet },
  { label: "import data", href: "/import", Icon: UploadCloud },
  { label: "settings", href: "/settings", Icon: Settings },
];

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Split flat account list into ASSETS / DEBTS groups based on balance sign. */
function groupAccounts(accounts: SidebarAccount[]) {
  // TODO: when accounts table has a `type` column (checking/savings/credit/loan),
  // use that to split into three groups: assets / credit / loans.
  const assets = accounts.filter((a) => a.balance >= 0);
  const debts = accounts.filter((a) => a.balance < 0);
  return [
    ...(assets.length ? [{ label: "assets", accounts: assets }] : []),
    ...(debts.length ? [{ label: "debts", accounts: debts }] : []),
  ];
}

/** Nah expression + optional header microcopy based on days since last log. */
function nahState(days: number): {
  expression: NahExpression;
  microcopy: string | null;
} {
  if (days <= 1) return { expression: "default", microcopy: null };
  if (days === 2)
    return { expression: "skeptical", microcopy: "haven't seen you log." };
  if (days <= 4)
    return { expression: "disappointed", microcopy: `${days} days. slipping.` };
  if (days <= 6)
    return { expression: "disappointed", microcopy: "we both know." };
  return { expression: "disappointed", microcopy: "...nah." };
}

// ΓöÇΓöÇΓöÇ Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function AppSidebar({
  accounts,
  inboxCount = 0,
  collapsed,
  onCollapse,
  daysSinceLastLog = 0,
  footerReaction = "we're working on it.",
}: AppSidebarProps) {
  const pathname = usePathname();
  const { hidden, toggle } = useHideBalances();
  const groups = groupAccounts(accounts);
  const { expression, microcopy } = nahState(daysSinceLastLog);

  const assets = accounts
    .filter((a) => a.balance >= 0)
    .reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts
    .filter((a) => a.balance < 0)
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = assets + liabilities;

  return (
    <aside
      className="flex flex-col bg-ink rounded-2xl overflow-hidden transition-all duration-300 h-full"
      style={{ width: collapsed ? 56 : 208 }}
    >
      {/* ΓöÇΓöÇ Brand header ΓÇö collapse toggle lives here ΓöÇΓöÇ */}
      {collapsed ? (
        <button
          onClick={onCollapse}
          className="flex items-center justify-center py-3 border-b border-white/8 shrink-0 hover:bg-white/5 cursor-pointer transition-none w-full"
          title="Expand sidebar"
        >
          <div className="nah-idle">
            <Nah expression={expression} size={28} />
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-2.5 px-3 py-3 border-b border-white/8 shrink-0">
          <div className="nah-idle shrink-0">
            <Nah expression={expression} size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-pixel text-cream-soft text-xl leading-none tracking-wide block">
              Nah
            </span>
            {microcopy && (
              <span className="font-sans text-[10px] text-cream-soft/40 leading-none mt-0.5 block truncate">
                {microcopy}
              </span>
            )}
          </div>
          <button
            onClick={onCollapse}
            className="shrink-0 p-1 text-cream-soft/30 hover:text-cream-soft/70 cursor-pointer transition-none"
            title="Collapse sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      )}

      {/* ΓöÇΓöÇ Scrollable nav + accounts ΓöÇΓöÇ */}
      <nav className="px-0 pt-2 pb-3 flex-1 overflow-y-auto">
        {!collapsed && (
          <p className="font-pixel text-[10px] text-cream-soft/35 px-3 mb-1.5">
            menu
          </p>
        )}

        <ul className="space-y-px">
          {NAV.map(({ label, href, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-2.5 pl-3 pr-2 py-1.5 border-l-2 transition-none ${
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
                  {/* Inbox badge */}
                  {href === "/inbox" && inboxCount > 0 && !collapsed && (
                    <span className="font-pixel text-[9px] bg-lime text-ink px-1 rounded-sm leading-tight shrink-0">
                      {inboxCount}
                    </span>
                  )}
                  {href === "/inbox" && inboxCount > 0 && collapsed && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-lime rounded-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ΓöÇΓöÇ Accounts ΓÇö grouped ΓöÇΓöÇ */}
        {!collapsed && (
          <div className="mt-2">
            {groups.map((group, gi) => (
              <div key={group.label}>
                <div
                  className={`border-t-2 border-cream-soft/10 mx-3 mb-1 pt-2 ${
                    gi === 0 ? "mt-2" : "mt-3"
                  }`}
                >
                  <p className="font-pixel text-[10px] text-cream-soft/35">
                    {group.label}
                  </p>
                </div>
                <ul className="space-y-px">
                  {group.accounts.map((acc) => (
                    <li key={acc.id}>
                      <Link
                        href={`/accounts/${acc.id}`}
                        className="flex items-center justify-between pl-3 pr-2 py-1 hover:bg-white/5 transition-none"
                      >
                        <span className="font-sans text-[11px] text-cream-soft/50 truncate pr-1">
                          {acc.name}
                        </span>
                        <span
                          className="font-mono text-[10px] shrink-0"
                          style={{
                            color:
                              acc.balance >= 0
                                ? "#C5F03A"
                                : "rgba(250,247,236,0.40)",
                          }}
                        >
                          {hidden ? "ΓÇóΓÇóΓÇóΓÇó" : eur(acc.balance)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* ΓöÇΓöÇ Totals ΓÇö right below accounts ΓöÇΓöÇ */}
            <div className="mx-3 mt-3 pt-3 border-t-2 border-cream-soft/10">
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-[10px] text-cream-soft/40">
                    assets
                  </span>
                  <span className="font-mono text-[10px] text-lime">
                    {hidden ? "ΓÇóΓÇóΓÇóΓÇó" : eur(assets)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-[10px] text-cream-soft/40">
                    debt
                  </span>
                  <span className="font-mono text-[10px] text-cream-soft/55">
                    {hidden ? "ΓÇóΓÇóΓÇóΓÇó" : eur(liabilities)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-t border-white/10 pt-1">
                  <span className="font-sans text-[10px] text-cream-soft/60">
                    net worth
                  </span>
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{
                      color:
                        netWorth >= 0 ? "#C5F03A" : "rgba(250,247,236,0.75)",
                    }}
                  >
                    {hidden ? "ΓÇóΓÇóΓÇóΓÇó" : eur(netWorth)}
                  </span>
                </div>
              </div>

              {/* Nah + reaction */}
              <div className="flex items-center gap-2">
                <Nah expression={expression} size={32} />
                <span className="font-sans text-[10px] text-cream-soft/40 leading-snug">
                  {footerReaction}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ΓöÇΓöÇ Utility row (hide balances + logout) ΓöÇΓöÇ */}
        <div
          className={`mt-4 pt-3 border-t border-white/8 space-y-px ${
            collapsed ? "px-1.5" : "px-0"
          }`}
        >
          <form action={logout}>
            <button
              type="submit"
              title={collapsed ? "Lock" : undefined}
              className={`flex items-center gap-2.5 pl-3 pr-2 py-1.5 w-full border-l-2 border-transparent text-cream-soft/35 hover:border-cream-soft/25 hover:bg-white/5 hover:text-cream-soft/60 cursor-pointer transition-none ${
                collapsed ? "justify-center pl-0 pr-0" : ""
              }`}
            >
              <LogOut size={13} className="shrink-0" />
              {!collapsed && (
                <span className="font-pixel text-[11px] leading-none">
                  lock
                </span>
              )}
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}

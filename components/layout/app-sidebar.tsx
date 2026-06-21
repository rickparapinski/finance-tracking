"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "pixelarticons/react/Home";
import { ArrowsHorizontal } from "pixelarticons/react/ArrowsHorizontal";
import { Wallet } from "pixelarticons/react/Wallet";
import { Upload } from "pixelarticons/react/Upload";
import { Settings2 } from "pixelarticons/react/Settings2";
import { ListBox } from "pixelarticons/react/ListBox";
import { Logout } from "pixelarticons/react/Logout";
import { Sparkles } from "pixelarticons/react/Sparkles";
import { ChevronLeft } from "pixelarticons/react/ChevronLeft";
import { logout } from "@/app/login/actions";
import { useHideBalances } from "@/contexts/hide-balances";
import { slugify } from "@/lib/slugify";
import { Nah, type NahExpression } from "@/components/Nah";

// --- Types -------------------------------------------------------------------

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
  daysSinceLastLog?: number;
  footerReaction?: string;
}

// --- Nav items ---------------------------------------------------------------

// Primary tier — daily-use pages
const NAV_PRIMARY = [
  { label: "overview",     href: "/",             Icon: Home },
  { label: "transactions", href: "/transactions", Icon: ArrowsHorizontal },
  { label: "categories",   href: "/categories",   Icon: ListBox },
  { label: "accounts",     href: "/accounts",     Icon: Wallet },
  { label: "advisor",      href: "/advisor",      Icon: Sparkles },
];

// Utility tier — de-emphasised, sits above the lock button
const NAV_UTILITY = [
  { label: "import data",  href: "/import",       Icon: Upload },
  { label: "settings",     href: "/settings",     Icon: Settings2 },
];

// --- Helpers -----------------------------------------------------------------

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function groupAccounts(accounts: SidebarAccount[]) {
  const assets = accounts.filter((a) => a.balance >= 0);
  const debts  = accounts.filter((a) => a.balance < 0);
  return [
    ...(assets.length ? [{ label: "assets", accounts: assets }] : []),
    ...(debts.length  ? [{ label: "debts",  accounts: debts  }] : []),
  ];
}

function nahState(days: number): { expression: NahExpression; microcopy: string | null } {
  if (days <= 1) return { expression: "default",      microcopy: null };
  if (days === 2) return { expression: "skeptical",   microcopy: "haven't seen you log." };
  if (days <= 4)  return { expression: "disappointed", microcopy: `${days} days. slipping.` };
  if (days <= 6)  return { expression: "disappointed", microcopy: "we both know." };
  return               { expression: "disappointed",   microcopy: "...nah." };
}

// --- NavItem -----------------------------------------------------------------

function NavItem({
  label, href, Icon, active, collapsed,
}: {
  label: string; href: string; Icon: React.FC<any>; active: boolean; collapsed: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-2.5 pl-3 pr-2 py-1.5 border-l-2 transition-none ${
          active
            ? "border-lime bg-white/8 text-cream-soft"
            : "border-transparent text-cream-soft/45 hover:border-cream-soft/25 hover:bg-white/5 hover:text-cream-soft/70"
        }`}
      >
        <Icon className="size-[13px] shrink-0" />
        {!collapsed && (
          <span className={`font-pixel text-[11px] flex-1 truncate leading-none ${active ? "translate-x-0.5" : ""}`}>
            {label}
          </span>
        )}
      </Link>
    </li>
  );
}

// --- Component ---------------------------------------------------------------

export function AppSidebar({
  accounts,
  inboxCount = 0,
  collapsed,
  onCollapse,
  daysSinceLastLog = 0,
  footerReaction = "we're working on it.",
}: AppSidebarProps) {
  const pathname  = usePathname();
  const { hidden } = useHideBalances();
  const groups    = groupAccounts(accounts);
  const { expression, microcopy } = nahState(daysSinceLastLog);

  const assets    = accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);
  const netWorth  = assets + liabilities;

  return (
    <aside
      className="flex flex-col bg-ink overflow-hidden h-full"
      style={{ width: collapsed ? 56 : 208 }}
    >
      {/* Brand header / collapse toggle */}
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
            <span className="font-pixel text-cream-soft text-xl leading-none tracking-wide block">Nah</span>
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
            <ChevronLeft className="size-[14px]" />
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <nav className="flex flex-col flex-1 overflow-y-auto pt-2 pb-1">

        {/* Primary nav */}
        <ul className="space-y-px">
          {NAV_PRIMARY.map(({ label, href, Icon }) => (
            <NavItem key={href} label={label} href={href} Icon={Icon} active={pathname === href} collapsed={collapsed} />
          ))}
        </ul>

        {/* Accounts list — expanded only */}
        {!collapsed && (
          <div className="mt-2 flex-1">
            {groups.map((group, gi) => (
              <div key={group.label}>
                <div className={`border-t-2 border-cream-soft/10 mx-3 mb-1 pt-2 ${gi === 0 ? "mt-2" : "mt-3"}`}>
                  <p className="font-pixel text-[10px] text-cream-soft/35">{group.label}</p>
                </div>
                <ul className="space-y-px">
                  {group.accounts.map((acc) => (
                    <li key={acc.id}>
                      <Link
                        href={`/accounts/${slugify(acc.name)}`}
                        className="flex items-center justify-between pl-3 pr-2 py-1 hover:bg-white/5 transition-none"
                      >
                        <span className="font-sans text-[11px] text-cream-soft/50 truncate pr-1">{acc.name}</span>
                        <span
                          className="font-mono text-[10px] shrink-0"
                          style={{ color: acc.balance >= 0 ? "#C5F03A" : "rgba(250,247,236,0.40)" }}
                        >
                          {hidden ? "••••" : eur(acc.balance)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Net worth totals */}
            <div className="mx-3 mt-3 pt-3 border-t-2 border-cream-soft/10">
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-[10px] text-cream-soft/40">assets</span>
                  <span className="font-mono text-[10px] text-lime">{hidden ? "••••" : eur(assets)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-[10px] text-cream-soft/40">debt</span>
                  <span className="font-mono text-[10px] text-cream-soft/55">{hidden ? "••••" : eur(liabilities)}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-white/10 pt-1">
                  <span className="font-sans text-[10px] text-cream-soft/60">net worth</span>
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{ color: netWorth >= 0 ? "#C5F03A" : "rgba(250,247,236,0.75)" }}
                  >
                    {hidden ? "••••" : eur(netWorth)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Nah expression={expression} size={32} />
                <span className="font-sans text-[10px] text-cream-soft/40 leading-snug">{footerReaction}</span>
              </div>
            </div>
          </div>
        )}

        {/* Utility nav — sits above the lock, visually muted */}
        <div className="mt-auto pt-2 border-t border-white/8">
          <ul className="space-y-px">
            {NAV_UTILITY.map(({ label, href, Icon }) => (
              <NavItem key={href} label={label} href={href} Icon={Icon} active={pathname === href} collapsed={collapsed} />
            ))}
          </ul>

          {/* Lock / logout */}
          <div className="mt-px">
            <form action={logout}>
              <button
                type="submit"
                title={collapsed ? "Lock" : undefined}
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 w-full border-l-2 border-transparent text-cream-soft/30 hover:border-cream-soft/20 hover:bg-white/5 hover:text-cream-soft/55 cursor-pointer transition-none"
              >
                <Logout className="size-[13px] shrink-0" />
                {!collapsed && (
                  <span className="font-pixel text-[11px] leading-none">lock</span>
                )}
              </button>
            </form>
          </div>
        </div>

      </nav>
    </aside>
  );
}

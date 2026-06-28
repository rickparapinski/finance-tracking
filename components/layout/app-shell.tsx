"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "pixelarticons/react/Home";
import { ArrowsHorizontal } from "pixelarticons/react/ArrowsHorizontal";
import { Wallet } from "pixelarticons/react/Wallet";
import { ListBox } from "pixelarticons/react/ListBox";
import { CalendarRange } from "pixelarticons/react/CalendarRange";
import { Sparkles } from "pixelarticons/react/Sparkles";
import { AppSidebar, type SidebarAccount } from "./app-sidebar";

const SIDEBAR_W_EXPANDED  = 208;
const SIDEBAR_W_COLLAPSED = 56;

const MOBILE_NAV = [
  { label: "home",          href: "/",             Icon: Home },
  { label: "transactions",  href: "/transactions", Icon: ArrowsHorizontal },
  { label: "categories",    href: "/categories",   Icon: ListBox },
  { label: "accounts",      href: "/accounts",     Icon: Wallet },
  { label: "forecast",      href: "/forecast",     Icon: CalendarRange },
  { label: "advisor",       href: "/advisor",      Icon: Sparkles },
];

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-20 bg-ink border-t border-white/8">
      <ul className="flex justify-around">
        {MOBILE_NAV.map(({ label, href, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                title={label}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 w-full transition-none ${
                  active ? "text-cream-soft" : "text-cream-soft/40"
                }`}
              >
                <Icon className="size-5" />
                <span className="font-pixel text-[8px] leading-[1.2]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  accounts: SidebarAccount[];
  inboxCount?: number;
  daysSinceLastLog?: number;
}

export function AppShell({
  children,
  accounts,
  inboxCount = 0,
  daysSinceLastLog = 0,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;
  const GAP = 12;

  return (
    <div className="flex min-h-screen">
      {/* Floating sidebar — desktop only */}
      <div
        className="hidden md:block fixed top-3 left-3 bottom-3 z-10 transition-all duration-300"
        style={{ width: sidebarW }}
      >
        <AppSidebar
          accounts={accounts}
          inboxCount={inboxCount}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((c) => !c)}
          daysSinceLastLog={daysSinceLastLog}
        />
      </div>

      {/* Main content — desktop */}
      <main
        className="flex-1 transition-all duration-300 hidden md:block"
        style={{ paddingLeft: sidebarW + GAP * 2 }}
      >
        {children}
      </main>

      {/* Main content — mobile (extra bottom padding for nav bar) */}
      <main className="flex-1 md:hidden pb-16">{children}</main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}

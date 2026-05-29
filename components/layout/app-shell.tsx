"use client";

import { useState } from "react";
import Link from "next/link";
import { AppSidebar, type SidebarAccount } from "./app-sidebar";
import { useHideBalances } from "@/contexts/hide-balances";
import { Eye } from "pixelarticons/react/Eye";
import { EyeOff } from "pixelarticons/react/EyeOff";
import { Bell } from "pixelarticons/react/Bell";

const SIDEBAR_W_EXPANDED  = 208;
const SIDEBAR_W_COLLAPSED = 56;

interface AppShellProps {
  children: React.ReactNode;
  accounts: SidebarAccount[];
  inboxCount?: number;
  daysSinceLastLog?: number;
}

/** Global chrome bar — eye toggle + inbox bell, top-right on every page */
function GlobalChrome({ inboxCount }: { inboxCount: number }) {
  const { hidden, toggle } = useHideBalances();

  const btnCls =
    "size-8 grid place-items-center border-2 border-ink bg-surface text-ink-soft " +
    "shadow-[2px_2px_0_#1F1F1F] hover:bg-lime hover:text-ink hover:shadow-[1px_1px_0_#1F1F1F] " +
    "hover:translate-x-[1px] hover:translate-y-[1px] " +
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none " +
    "cursor-pointer transition-none";

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={toggle} className={btnCls} title={hidden ? "Show balances" : "Hide balances"}>
        {hidden ? <EyeOff className="size-[14px]" /> : <Eye className="size-[14px]" />}
      </button>
      <Link href="/inbox" className={`relative ${btnCls}`} title="Inbox">
        <Bell className="size-[14px]" />
        {inboxCount > 0 && (
          <span className="absolute -top-1 -right-1 size-3.5 grid place-items-center bg-lime border border-ink font-mono text-[8px] text-ink leading-none">
            {inboxCount > 9 ? "9+" : inboxCount}
          </span>
        )}
      </Link>
    </div>
  );
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
      {/* Floating sidebar */}
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

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-300 hidden md:block"
        style={{ paddingLeft: sidebarW + GAP * 2 }}
      >
        {/* Global chrome — pinned top-right of main area on every page */}
        <div className="sticky top-0 z-20 flex justify-end px-6 pt-4 pb-2 pointer-events-none">
          <div className="pointer-events-auto">
            <GlobalChrome inboxCount={inboxCount} />
          </div>
        </div>
        {/* Page content — negative margin-top so chrome doesn't push content down */}
        <div className="-mt-14">
          {children}
        </div>
      </main>

      {/* Mobile: no sidebar, full width */}
      <main className="flex-1 md:hidden">{children}</main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AppSidebar, type SidebarAccount } from "./app-sidebar";

const SIDEBAR_W_EXPANDED  = 208;
const SIDEBAR_W_COLLAPSED = 56;

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

  // 12px gap on each side (p-3) so the sidebar floats away from the edges
  const GAP = 12;

  return (
    <div className="flex min-h-screen">
      {/* Floating sidebar — inset from all edges so it doesn't touch the screen border */}
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

      {/* Main content — offset by sidebar width + left inset + gap */}
      <main
        className="flex-1 transition-all duration-300 hidden md:block"
        style={{ paddingLeft: sidebarW + GAP * 2 }}
      >
        {children}
      </main>

      {/* Mobile: no sidebar, full width */}
      <main className="flex-1 md:hidden">{children}</main>
    </div>
  );
}

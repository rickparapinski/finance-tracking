"use client";

import Link from "next/link"; // Make sure Link is imported
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  UploadCloud,
  Plus,
  Settings,
  LayoutList,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  accounts: {
    id: string;
    name: string;
    color: string;
    balance: number;
    currency: string;
  }[];
}

const menuItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/" },
  { label: "Transactions", icon: ArrowRightLeft, href: "/transactions" },
  { label: "Forecast", icon: TrendingUp, href: "/forecast" },
  { label: "Categories", icon: LayoutList, href: "/categories" },
  { label: "Manage Accounts", icon: Wallet, href: "/accounts" },
  { label: "Import Data", icon: UploadCloud, href: "/import" },
];

export function AppSidebar({ accounts }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r border-border bg-white shadow-[var(--shadow-soft)] text-slate-900 min-h-screen flex flex-col">
      {/* Brand */}
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
            F
          </div>
          FinanceTracker
        </div>
      </div>

      {/* Main Menu */}
      <div className="px-3 mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
          Menu
        </p>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-50 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Accounts List */}
      <div className="px-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your Accounts
          </p>
          <Link
            href="/accounts"
            className="text-muted-foreground hover:text-primary"
          >
            <Plus size={14} />
          </Link>
        </div>

        <div className="space-y-1">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="group flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: acc.color || "#71717a" }}
                />
                <span className="truncate font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {acc.name}
                </span>
              </div>
              <span className="font-mono text-xs font-semibold">
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: acc.currency,
                  maximumFractionDigits: 0,
                }).format(acc.balance)}
              </span>
            </div>
          ))}

          {accounts.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground italic">
              No accounts yet.
            </div>
          )}
        </div>
      </div>

      {/* Footer - NOW UPDATED TO LINK */}
      <div className="p-4 border-t border-border mt-auto">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 w-full text-sm font-medium transition-colors rounded-xl",
            pathname === "/settings"
              ? "bg-slate-50 text-slate-900"
              : "text-muted-foreground hover:text-foreground hover:bg-slate-50",
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </div>
  );
}

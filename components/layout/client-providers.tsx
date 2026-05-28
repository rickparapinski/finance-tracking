"use client";

import { HideBalancesProvider } from "@/contexts/hide-balances";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <HideBalancesProvider>{children}</HideBalancesProvider>;
}

"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type HideBalancesCtx = {
  hidden: boolean;
  toggle: () => void;
};

const HideBalancesContext = createContext<HideBalancesCtx>({ hidden: false, toggle: () => {} });

export function HideBalancesProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  // Read from localStorage once on mount (avoids SSR mismatch)
  useEffect(() => {
    setHidden(localStorage.getItem("hideBalances") === "true");
  }, []);

  const toggle = useCallback(() => {
    setHidden((h) => {
      localStorage.setItem("hideBalances", String(!h));
      return !h;
    });
  }, []);

  return (
    <HideBalancesContext.Provider value={{ hidden, toggle }}>
      {children}
    </HideBalancesContext.Provider>
  );
}

export const useHideBalances = () => useContext(HideBalancesContext);

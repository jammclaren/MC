"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "wesmincom-topbar-collapsed";

const NavCollapseContext = createContext<{ collapsed: boolean; toggle: () => void } | null>(null);

export function NavCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved preference after mount (not during SSR) so the server-
  // and first-client-render markup match; a stored "collapsed" value
  // otherwise causes a hydration mismatch against the always-expanded SSR
  // output. Deferred via setTimeout, same as LiveClock's first tick, to
  // avoid a synchronous setState-in-effect cascading render on mount.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <NavCollapseContext.Provider value={{ collapsed, toggle }}>
      {children}
    </NavCollapseContext.Provider>
  );
}

export function useNavCollapse() {
  const ctx = useContext(NavCollapseContext);
  if (!ctx) {
    throw new Error("useNavCollapse must be used within a NavCollapseProvider");
  }
  return ctx;
}

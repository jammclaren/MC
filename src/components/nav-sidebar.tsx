"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavLinks, type NavLinkItem } from "@/components/nav-links";
import { LiveClock } from "@/components/live-clock";
import { SignOutButton } from "@/components/sign-out-button";

const STORAGE_KEY = "wesmincom-sidebar-collapsed";

export function NavSidebar({
  links,
  roleLine,
}: {
  links: readonly NavLinkItem[];
  roleLine: string;
}) {
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
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-primary/30 bg-background/95 shadow-[1px_0_16px_-4px_var(--primary)] backdrop-blur transition-[width] duration-200 supports-backdrop-filter:bg-background/80",
        collapsed ? "w-14" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-border py-4",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        {!collapsed && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- small
                static header mark; not worth next/image's optimization
                pipeline for a 22KB, always-visible icon. */}
            <img
              src="/wesmincom-seal.png"
              alt="Western Mindanao Command seal"
              className="size-8 shrink-0"
            />
            <span className="flex flex-col">
              <span className="font-display text-sm leading-tight font-bold tracking-widest uppercase">
                WESMINCOM
              </span>
              <span className="font-display text-sm leading-tight font-bold tracking-widest text-primary uppercase">
                Dashboard
              </span>
            </span>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={collapsed ? "" : "ml-auto"}
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        {!collapsed && <NavLinks links={links} />}
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
          <LiveClock />
          <span className="font-mono text-xs text-muted-foreground">{roleLine}</span>
          <SignOutButton />
        </div>
      )}
    </aside>
  );
}

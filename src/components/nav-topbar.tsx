"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { NavLinks, type NavLinkItem } from "@/components/nav-links";
import { LiveClock } from "@/components/live-clock";
import { SignOutButton } from "@/components/sign-out-button";

const STORAGE_KEY = "wesmincom-topbar-collapsed";

export function NavTopBar({
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

  if (collapsed) {
    return (
      <header className="fixed top-8 right-8 z-40">
        <Switch checked={collapsed} onCheckedChange={toggle} aria-label="Show navigation bar" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-primary/30 bg-background/95 shadow-[0_1px_16px_-4px_var(--primary)] backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex w-full items-center gap-3 px-3 sm:gap-6 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-8">
          <div className="flex shrink-0 items-center gap-2.5 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- small
                static header mark; not worth next/image's optimization
                pipeline for a 22KB, always-visible icon. */}
            <img
              src="/wesmincom-seal.png"
              alt="Western Mindanao Command seal"
              className="size-8"
            />
            <span className="flex size-2 rounded-full bg-status-good shadow-[0_0_6px_var(--status-good)]" />
            <span className="font-dune hidden text-base tracking-widest uppercase md:inline">
              WMC <span className="text-sunset-gradient">MONITORING</span>
            </span>
          </div>
          <NavLinks links={links} />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <LiveClock />
          <span className="hidden font-mono text-xs text-muted-foreground lg:inline">
            {roleLine}
          </span>
          <SignOutButton />
          <Switch checked={collapsed} onCheckedChange={toggle} aria-label="Hide navigation bar" />
        </div>
      </div>
    </header>
  );
}

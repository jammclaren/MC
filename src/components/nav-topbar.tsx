"use client";

import { Switch } from "@/components/ui/switch";
import { NavLinks, type NavLinkItem } from "@/components/nav-links";
import { LiveClock } from "@/components/live-clock";
import { SignOutButton } from "@/components/sign-out-button";
import { useNavCollapse } from "@/components/nav-collapse-context";

export function NavTopBar({
  links,
  roleLine,
}: {
  links: readonly NavLinkItem[];
  roleLine: string;
}) {
  const { collapsed, toggle } = useNavCollapse();

  // The "Show navigation bar" switch itself lives inline next to each
  // page's title (see NavCollapseToggle) so it's guaranteed to sit in the
  // same row, not a separate header element guessing at alignment.
  if (collapsed) {
    return null;
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

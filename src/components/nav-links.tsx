"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavLinkItem {
  href: string;
  label: string;
}

export function NavLinks({ links }: { links: readonly NavLinkItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex min-w-0 items-center gap-5 overflow-x-auto text-sm">
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative shrink-0 py-4 font-display text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-colors",
              active
                ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary after:content-['']"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

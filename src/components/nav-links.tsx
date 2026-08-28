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
    <nav className="flex flex-col gap-1 text-sm">
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative rounded-md px-3 py-2.5 font-display text-xs font-semibold tracking-widest uppercase transition-colors",
              active
                ? "bg-primary/10 text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:content-['']"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

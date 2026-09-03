"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavLinkItem {
  href: string;
  label: string;
}

const GAP_PX = 20; // matches gap-5 below
const ITEM_CLASS =
  "shrink-0 py-4 font-display text-xs font-semibold tracking-wide whitespace-nowrap uppercase";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Fits as many links as possible into a single row and tucks whatever
 * doesn't fit into a "More" dropdown — never scrolls, never wraps to a
 * second line, and (unlike a fixed cutoff) never hides a link outright.
 * An invisible "ruler" copy of every link is measured to decide the split;
 * it re-measures on resize via ResizeObserver.
 */
export function NavLinks({ links }: { links: readonly NavLinkItem[] }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(links.length);

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      const ruler = rulerRef.current;
      if (!container || !ruler) return;

      const children = Array.from(ruler.children) as HTMLElement[];
      const itemEls = children.slice(0, links.length);
      const moreEl = children[links.length];
      if (!moreEl) return;

      const containerWidth = container.clientWidth;
      const itemWidths = itemEls.map((el) => el.getBoundingClientRect().width);
      const moreWidth = moreEl.getBoundingClientRect().width;

      const fullWidth =
        itemWidths.reduce((sum, w) => sum + w, 0) + GAP_PX * Math.max(0, links.length - 1);
      if (fullWidth <= containerWidth) {
        setVisibleCount(links.length);
        return;
      }

      let used = 0;
      let count = 0;
      for (let i = 0; i < itemWidths.length; i++) {
        const candidateUsed = used + (count > 0 ? GAP_PX : 0) + itemWidths[i];
        if (candidateUsed + GAP_PX + moreWidth > containerWidth) break;
        used = candidateUsed;
        count++;
      }
      setVisibleCount(count);
    }

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [links]);

  const visibleLinks = links.slice(0, visibleCount);
  const overflowLinks = links.slice(visibleCount);
  const overflowHasActive = overflowLinks.some((l) => isActive(pathname, l.href));

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden">
      {/* Offscreen measuring copy — identical markup/classes, used only to
          read natural widths; never shown or interactive. */}
      <div
        ref={rulerRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 flex items-center gap-5 opacity-0"
      >
        {links.map((link) => (
          <span key={link.href} className={ITEM_CLASS}>
            {link.label}
          </span>
        ))}
        <span className={cn(ITEM_CLASS, "flex items-center gap-1")}>
          More <ChevronDown className="size-3" />
        </span>
      </div>

      <nav className="flex items-center gap-5 text-sm">
        {visibleLinks.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative",
                ITEM_CLASS,
                "transition-colors",
                active
                  ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary after:content-['']"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        {overflowLinks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                ITEM_CLASS,
                "flex items-center gap-1 outline-none transition-colors",
                overflowHasActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              More
              <ChevronDown className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {overflowLinks.map((link) => (
                <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    </div>
  );
}

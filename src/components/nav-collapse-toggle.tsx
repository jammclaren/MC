"use client";

import { Switch } from "@/components/ui/switch";
import { useNavCollapse } from "@/components/nav-collapse-context";

/** Placed directly next to each page's <h1>, in normal document flow, so
 * it sits exactly on the same row as the title — not a floating overlay
 * guessing at alignment. Only renders once the nav bar is hidden, mirroring
 * where the "Hide navigation bar" switch itself lives in the expanded
 * header. */
export function NavCollapseToggle() {
  const { collapsed, toggle } = useNavCollapse();
  if (!collapsed) return null;
  return <Switch checked={collapsed} onCheckedChange={toggle} aria-label="Show navigation bar" />;
}

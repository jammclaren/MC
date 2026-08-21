"use client";

import dynamic from "next/dynamic";
import type { ScoredArea } from "@/lib/queries/priority-areas";

// Leaflet touches window/document at load time, so it can't be
// server-rendered — load it client-only from behind this "use client"
// boundary (next/dynamic's ssr:false is only valid in Client Components).
const PriorityMap = dynamic(
  () => import("./priority-map").then((mod) => mod.PriorityMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full animate-pulse rounded-md border bg-muted" />
    ),
  }
);

export function PriorityMapLoader({ areas }: { areas: ScoredArea[] }) {
  return <PriorityMap areas={areas} />;
}

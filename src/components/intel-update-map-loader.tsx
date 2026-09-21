"use client";

import dynamic from "next/dynamic";
import type { IntelUpdateRow } from "@/lib/queries/intel-updates";

// Leaflet touches window/document at load time, so it can't be
// server-rendered — same client-only boundary as OverviewIncidentMapLoader.
const IntelUpdateMap = dynamic(
  () => import("./intel-update-map").then((mod) => mod.IntelUpdateMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[400px] w-full animate-pulse rounded-md border bg-muted" />
    ),
  }
);

export function IntelUpdateMapLoader({ rows }: { rows: IntelUpdateRow[] }) {
  return <IntelUpdateMap rows={rows} />;
}

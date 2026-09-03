"use client";

import dynamic from "next/dynamic";
import type { IncidentMarker } from "@/lib/queries/incident-markers";

// Leaflet touches window/document at load time, so it can't be
// server-rendered — load it client-only from behind this "use client"
// boundary (next/dynamic's ssr:false is only valid in Client Components).
const OverviewIncidentMap = dynamic(
  () => import("./overview-incident-map").then((mod) => mod.OverviewIncidentMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[400px] w-full animate-pulse rounded-md border bg-muted" />
    ),
  }
);

export function OverviewIncidentMapLoader({ markers }: { markers: IncidentMarker[] }) {
  return <OverviewIncidentMap markers={markers} />;
}

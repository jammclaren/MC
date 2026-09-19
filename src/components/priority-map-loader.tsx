"use client";

import dynamic from "next/dynamic";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import type { IntelMarker } from "@/lib/queries/intel-markers";
import type { ElectionAreaOption, JtfOption } from "@/components/incident-marker-form-dialog";

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

export function PriorityMapLoader({
  markers,
  intelMarkers,
  jtfOptions,
  areaOptions,
  lockJtfId,
  canCreateMarker,
}: {
  markers: IncidentMarker[];
  intelMarkers: IntelMarker[];
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  lockJtfId?: string;
  canCreateMarker: boolean;
}) {
  return (
    <PriorityMap
      markers={markers}
      intelMarkers={intelMarkers}
      jtfOptions={jtfOptions}
      areaOptions={areaOptions}
      lockJtfId={lockJtfId}
      canCreateMarker={canCreateMarker}
    />
  );
}

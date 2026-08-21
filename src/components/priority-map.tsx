"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, CircleMarker, Tooltip } from "react-leaflet";
import type { ScoredArea } from "@/lib/queries/priority-areas";

// No TileLayer is configured: this deployment target is air-gapped, so we
// don't depend on an online tile provider (SPEC.md §4). Leaflet still works
// fine rendering vector shapes (CircleMarker) over a blank canvas. To add a
// basemap later — self-hosted tiles, or a static Mindanao/BARMM GeoJSON
// overlay — add a <TileLayer> or <GeoJSON> child here; nothing else about
// this component needs to change, keeping the map provider swappable.

const HOTSPOT_COLORS: Record<string, string> = {
  Red: "#dc2626",
  Yellow: "#ca8a04",
  Green: "#16a34a",
};
const DEFAULT_COLOR = "#6b7280";

// Rough BARMM/Western Mindanao center, used when no area coordinates exist.
const DEFAULT_CENTER: [number, number] = [7.2, 124.2];
const DEFAULT_ZOOM = 8;

export function PriorityMap({ areas }: { areas: ScoredArea[] }) {
  const plottable = areas.filter(
    (area): area is ScoredArea & { lat: number; lng: number } =>
      area.lat != null && area.lng != null
  );

  const center: [number, number] =
    plottable.length > 0 ? [plottable[0].lat, plottable[0].lng] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      className="h-[500px] w-full rounded-md border bg-muted"
      scrollWheelZoom
    >
      {plottable.map((area) => {
        const color = area.hotspotCategory
          ? (HOTSPOT_COLORS[area.hotspotCategory] ?? DEFAULT_COLOR)
          : DEFAULT_COLOR;
        const radius = 6 + Math.max(0, area.priorityScore) * 2;
        const label = [area.barangay, area.municipality, area.province]
          .filter(Boolean)
          .join(", ");

        return (
          <CircleMarker
            key={area.id}
            center={[area.lat, area.lng]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.6 }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-medium">{label}</div>
                <div>Hotspot: {area.hotspotCategory ?? "unclassified"}</div>
                <div>Priority score: {area.priorityScore.toFixed(1)}</div>
                <div>Precincts: {area.numPrecincts ?? "—"}</div>
                <div>Registered voters: {area.registeredVoters ?? "—"}</div>
                <div>Deployed: {area.deployedToPolling}</div>
                <div>Recent incidents (30d): {area.recentIncidentCount}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

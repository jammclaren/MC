"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from "react-leaflet";
import type { IntelUpdateRow } from "@/lib/queries/intel-updates";
import { buildIncidentIcon, isLatestIncident } from "@/lib/incident-marker-icon";
import {
  TacticalBlueprintPane,
  TACTICAL_BLUEPRINT_PANE,
  TACTICAL_BLUEPRINT_GLOW_PANE,
} from "@/components/tactical-blueprint-pane";

// Same base layer/theme as the Command Overview's Monitored Incidents Map
// (see overview-incident-map.tsx) — kept identical so both glance maps
// read as the same tactical product.
const DARK_CANVAS_BASE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_REFERENCE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community";

const DEFAULT_CENTER: [number, number] = [7.2, 124.2];
const DEFAULT_ZOOM = 7;

// Matches the Violent/Non-Violent colors already used by this page's
// SeverityMixChart, so the map's dots and that chart's legend agree.
const CATEGORY_COLOR: Record<IntelUpdateRow["category"], string> = {
  VIOLENT: "var(--status-critical)",
  NON_VIOLENT: "var(--status-warning)",
};

function FitToMarkers({ rows }: { rows: IntelUpdateRow[] }) {
  const map = useMap();
  useEffect(() => {
    if (rows.length === 0) return;
    const bounds = L.latLngBounds(rows.map((r) => [r.lat, r.lng] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);
  return null;
}

function useCurrentZoom(): number {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvent("zoomend", () => setZoom(map.getZoom()));
  return zoom;
}

function IntelUpdateMarkers({ rows }: { rows: IntelUpdateRow[] }) {
  const zoom = useCurrentZoom();
  return (
    <>
      {rows.map((row) => {
        const isRecent = isLatestIncident(row.createdAt);
        return (
          <Marker
            key={row.id}
            position={[row.lat, row.lng]}
            icon={buildIncidentIcon(isRecent ? "PULSE" : "NONE", zoom, CATEGORY_COLOR[row.category])}
            zIndexOffset={isRecent ? 2000 : 0}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-medium">{row.activityType ?? row.category}</div>
                <div>{new Date(row.date).toLocaleDateString()}</div>
                <div>{row.province}</div>
                {row.locationLabel && <div>{row.locationLabel}</div>}
                {row.threatGroup && <div>Threat Group: {row.threatGroup}</div>}
                {row.politicalParty && <div>Political Party: {row.politicalParty}</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

/** Read-only glance map of logged Intelligence Update activity, plotted
 * the same way the Command Overview plots incidents — a Violent/Non-Violent
 * colored dot per report rather than a dedicated editing surface. */
export function IntelUpdateMap({ rows }: { rows: IntelUpdateRow[] }) {
  return (
    <div className="relative isolate h-full min-h-[400px]">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full rounded-md border bg-muted"
        scrollWheelZoom={false}
      >
        <TacticalBlueprintPane />
        <TileLayer url={DARK_CANVAS_REFERENCE_URL} pane={TACTICAL_BLUEPRINT_GLOW_PANE} />
        <TileLayer
          attribution={DARK_CANVAS_ATTRIBUTION}
          url={DARK_CANVAS_BASE_URL}
          pane={TACTICAL_BLUEPRINT_PANE}
        />
        <TileLayer url={DARK_CANVAS_REFERENCE_URL} pane={TACTICAL_BLUEPRINT_PANE} />
        <IntelUpdateMarkers rows={rows} />
        <FitToMarkers rows={rows} />
      </MapContainer>
    </div>
  );
}

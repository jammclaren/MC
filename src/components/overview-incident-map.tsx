"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import { buildIncidentIcon, isLatestIncident } from "@/lib/incident-marker-icon";
import {
  TacticalBlueprintPane,
  TACTICAL_BLUEPRINT_PANE,
} from "@/components/tactical-blueprint-pane";

// Esri "Dark Gray Canvas" — same tiles as the Situation Map's "Tactical
// Blueprint" base layer, used here as this widget's fixed (only) base so
// the Command Overview glance view matches the full map's tactical theme
// by default. Free, no API key required.
const DARK_CANVAS_BASE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_REFERENCE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community";

// Same rough BARMM/Western Mindanao center used as the priority map's
// fallback, shown only when there are no plottable incidents to fit to.
const DEFAULT_CENTER: [number, number] = [7.2, 124.2];
const DEFAULT_ZOOM = 7;

/** Fits the map to every marker's bounds once markers are available,
 * instead of leaving the view on the rough BARMM-wide default. */
function FitToMarkers({ markers }: { markers: IncidentMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers.length]);
  return null;
}

/** Read-only glance view of monitored incidents for the Command Overview —
 * a lighter-weight sibling to the full Situation Map (editing, threat
 * categorization, layer toggles all stay on /priority-map). */
export function OverviewIncidentMap({ markers }: { markers: IncidentMarker[] }) {
  const violentCount = useMemo(
    () => markers.filter((m) => isLatestIncident(m.createdAt)).length,
    [markers]
  );

  return (
    <div className="relative isolate">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-[400px] w-full rounded-md border bg-muted"
        scrollWheelZoom={false}
      >
        <TacticalBlueprintPane />
        <TileLayer
          attribution={DARK_CANVAS_ATTRIBUTION}
          url={DARK_CANVAS_BASE_URL}
          pane={TACTICAL_BLUEPRINT_PANE}
        />
        <TileLayer url={DARK_CANVAS_REFERENCE_URL} pane={TACTICAL_BLUEPRINT_PANE} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={buildIncidentIcon(isLatestIncident(marker.createdAt) ? "PULSE" : marker.markerStyle)}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-medium">{marker.type}</div>
                <div>{new Date(marker.date).toLocaleDateString()}</div>
                <div>{marker.jtfName}</div>
                {marker.areaLabel && <div>{marker.areaLabel}</div>}
                {marker.result && <div>Result: {marker.result}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitToMarkers markers={markers} />
      </MapContainer>
      <div className="pointer-events-none absolute top-2 left-2 z-[900] rounded-md border border-primary/30 bg-card/90 px-3 py-1.5 text-xs shadow-[0_0_16px_-4px_var(--primary)] backdrop-blur-sm">
        <span className="font-mono font-medium tabular-nums text-primary">
          {markers.length.toLocaleString()}
        </span>{" "}
        <span className="text-muted-foreground">plotted</span>
        {violentCount > 0 && (
          <>
            {" · "}
            <span className="font-mono font-medium tabular-nums text-status-critical">
              {violentCount.toLocaleString()}
            </span>{" "}
            <span className="text-muted-foreground">in last hour</span>
          </>
        )}
      </div>
    </div>
  );
}

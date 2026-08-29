"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from "react-leaflet";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import { buildIncidentIcon, isLatestIncident } from "@/lib/incident-marker-icon";
import {
  TacticalBlueprintPane,
  TACTICAL_BLUEPRINT_PANE,
  TACTICAL_BLUEPRINT_GLOW_PANE,
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

/** Tracks the map's current zoom so marker icons can shrink as it zooms
 * out — must be rendered as a MapContainer descendant to reach useMap(). */
function useCurrentZoom(): number {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvent("zoomend", () => setZoom(map.getZoom()));
  return zoom;
}

function IncidentMarkers({ markers }: { markers: IncidentMarker[] }) {
  const zoom = useCurrentZoom();
  return (
    <>
      {markers.map((marker) => {
        const isRecent = isLatestIncident(marker.createdAt);
        return (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={buildIncidentIcon(isRecent ? "PULSE" : marker.markerStyle, zoom)}
            zIndexOffset={isRecent ? 1000 : 0}
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
        );
      })}
    </>
  );
}

/** Read-only glance view of monitored incidents for the Command Overview —
 * a lighter-weight sibling to the full Situation Map (editing, threat
 * categorization, layer toggles all stay on /priority-map). */
export function OverviewIncidentMap({ markers }: { markers: IncidentMarker[] }) {
  return (
    <div className="relative isolate">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-[400px] w-full rounded-md border bg-muted"
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
        <IncidentMarkers markers={markers} />
        <FitToMarkers markers={markers} />
      </MapContainer>
    </div>
  );
}

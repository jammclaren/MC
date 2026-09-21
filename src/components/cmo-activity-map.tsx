"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { CmoActivityFormDialog } from "@/components/cmo-activity-form-dialog";
import type { CmoActivityRow, CmoActivityCategory } from "@/lib/queries/cmo-activities";
import { CMO_CATEGORY_LABELS } from "@/lib/cmo-activity-assessment";
import { buildIncidentIcon, isLatestIncident } from "@/lib/incident-marker-icon";
import {
  TacticalBlueprintPane,
  TACTICAL_BLUEPRINT_PANE,
  TACTICAL_BLUEPRINT_GLOW_PANE,
} from "@/components/tactical-blueprint-pane";
import { MapPin } from "lucide-react";

// Same base layer/theme as the Command Overview and Intel Update glance
// maps (see overview-incident-map.tsx / intel-update-map.tsx).
const DARK_CANVAS_BASE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_REFERENCE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community";

const DEFAULT_CENTER: [number, number] = [7.2, 124.2];
const DEFAULT_ZOOM = 7;

const CATEGORY_COLOR: Record<CmoActivityCategory, string> = {
  PUBLIC_AFFAIRS: "var(--status-good)", // green
  CIVIL_AFFAIRS: "var(--chart-2)", // orange
  PSYOPS: "#ec4899", // pink — no theme token for this hue, hardcoded like the chart-* palette
  IEC: "var(--chart-4)",
};

function FitToMarkers({ rows }: { rows: CmoActivityRow[] }) {
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

function CmoActivityMarkers({ rows }: { rows: CmoActivityRow[] }) {
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
                <div className="font-medium">{row.title}</div>
                <div>{CMO_CATEGORY_LABELS[row.category]}</div>
                <div>{new Date(row.date).toLocaleDateString()}</div>
                {row.locationLabel && <div>{row.locationLabel}</div>}
                {row.canModify && (
                  <div className="mt-2 flex gap-1 border-t border-border pt-2">
                    <CmoActivityFormDialog
                      initial={{
                        id: row.id,
                        category: row.category,
                        title: row.title,
                        narrative: row.narrative,
                        lat: row.lat,
                        lng: row.lng,
                        locationLabel: row.locationLabel,
                        date: row.date.slice(0, 10),
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      url={`/api/cmo-activities/${row.id}`}
                      confirmMessage="Delete this CMO activity? This cannot be undone."
                    />
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

/** CMO's own map — a "pin an activity" glance view (Add Marker button
 * bottom-left), same read-only-elsewhere/editable-here split the full
 * Situation Map uses for incidents, just scoped to CmoActivity instead. */
export function CmoActivityMap({ rows, canWrite }: { rows: CmoActivityRow[]; canWrite: boolean }) {
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
        <CmoActivityMarkers rows={rows} />
        <FitToMarkers rows={rows} />
      </MapContainer>
      {canWrite && (
        <div className="absolute bottom-3 left-3 z-[1000]">
          <CmoActivityFormDialog
            trigger={
              <Button size="sm" className="shadow-lg">
                <MapPin className="size-4" />
                Add Marker
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}

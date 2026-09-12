"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import L from "leaflet";
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  CircleMarker,
  GeoJSON,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvent,
} from "react-leaflet";
import type { ScoredArea } from "@/lib/queries/priority-areas";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import type { IntelMarker } from "@/lib/queries/intel-markers";
import {
  IncidentMarkerFormDialog,
  type ElectionAreaOption,
  type JtfOption,
} from "@/components/incident-marker-form-dialog";
import { buildIncidentIcon, iconSizeForZoom, isLatestIncident, MAX_ICON_SIZE } from "@/lib/incident-marker-icon";
import {
  TacticalBlueprintPane,
  TACTICAL_BLUEPRINT_PANE,
  TACTICAL_BLUEPRINT_GLOW_PANE,
} from "@/components/tactical-blueprint-pane";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

// The base-layer switcher (bottom-left, under the zoom control) offers a
// live OpenStreetMap tile layer alongside an offline "Tactical Grid" option
// (no tiles at all — just the CSS HUD grid behind the vector overlays).
// SPEC.md originally ruled out any online tile provider for a fully
// air-gapped deployment; this app has since moved to Vercel + Supabase
// (cloud-hosted, not air-gapped), so OSM tiles are online-egress-only, not
// a hard requirement — the offline option stays for anyone who does deploy
// this on an isolated network. The province outline and barangay fills
// remain static local GeoJSON either way — see public/barmm-provinces.geojson
// and public/barmm-barangays.geojson (source: faeldon/philippines-json-maps,
// MIT licensed).
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Esri World Imagery — free, no API key required for standard basemap
// display (standard Esri attribution below).
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

// Esri "Light Gray Canvas" — a muted, minimal basemap meant not to compete
// visually with thematic overlays (like our threat-categorization fills).
// Two stacked services: a plain base + a reference layer carrying labels
// (roads/place names), same free/no-API-key tier as World Imagery above.
const LIGHT_CANVAS_BASE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const LIGHT_CANVAS_REFERENCE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const LIGHT_CANVAS_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community";

// Esri "Dark Gray Canvas" — same stacked base+reference pattern as Light
// Canvas above, but dark navy/charcoal with thin light line-work, giving
// the "tactical blueprint" read that matches this dashboard's HUD theme
// better than a bright basemap. Same free/no-API-key tier.
const DARK_CANVAS_BASE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_REFERENCE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const DARK_CANVAS_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community";

// Same validated status hex values as the Badge good/warning/serious/critical
// variants (src/app/globals.css) and the Green/Yellow/Orange/Red source
// categorization, so map fills and badges never disagree.
const HOTSPOT_COLORS: Record<string, string> = {
  Red: "#d03b3b",
  Orange: "#ec835a",
  Yellow: "#fab219",
  Green: "#0ca30c",
};
const DEFAULT_COLOR = "#5b6472";

// Rough BARMM/Western Mindanao center, used only until the province outline
// loads and the map fits to its actual bounds.
const DEFAULT_CENTER: [number, number] = [7.2, 124.2];
const DEFAULT_ZOOM = 8;

const PROVINCE_STYLE: L.PathOptions = {
  color: "#22d3ee",
  weight: 1.5,
  fillColor: "#0a3a3f",
  fillOpacity: 0.3,
  interactive: false,
  className: "province-outline-glow",
};

/** Corner-bracket + reticle framing, purely decorative HUD chrome — sits
 * above the map but below the Legend panel. */
function HudFrame() {
  const corner = "absolute size-5 border-primary/40";
  return (
    <div className="pointer-events-none absolute inset-0 z-[900]">
      <span className={`${corner} top-2 left-2 border-t-2 border-l-2`} />
      <span className={`${corner} top-2 right-2 border-t-2 border-r-2`} />
      <span className={`${corner} bottom-2 left-2 border-b-2 border-l-2`} />
      <span className={`${corner} right-2 bottom-2 border-r-2 border-b-2`} />
    </div>
  );
}

function areaKey(
  province: string | null | undefined,
  municipality: string | null | undefined,
  barangay: string | null | undefined
) {
  return `${province ?? ""}||${municipality ?? ""}||${barangay ?? ""}`;
}

// Standard ray-casting point-in-polygon test, [lng, lat] order to match
// GeoJSON's own coordinate order.
function pointInRing(point: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(point: [number, number], rings: number[][][]): boolean {
  if (!pointInRing(point, rings[0])) return false;
  // A point inside a hole (any ring after the first) isn't actually inside
  // the polygon.
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

function pointInGeometry(point: [number, number], geometry: GeoJSON.Geometry | null | undefined): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    return pointInPolygonRings(point, geometry.coordinates as number[][][]);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).some((rings) => pointInPolygonRings(point, rings));
  }
  return false;
}

function ProvinceLabel(feature: GeoJSON.Feature, layer: L.Layer) {
  const name = feature.properties?.adm2_en;
  if (name) {
    layer.bindTooltip(name, { sticky: true, className: "text-xs", direction: "center" });
  }
}

/** Fits the map to the province outline's bounds once it loads, instead of
 * leaving the view centered on a rough guess or the first marker. */
function FitToBounds({ data }: { data: GeoJSON.FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [16, 16] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return null;
}

const BASE_LAYER_STORAGE_KEY = "wesmincom-map-base-layer";

/** Remembers the last-selected base layer (OpenStreetMap/Satellite/Light
 * Canvas/Tactical Blueprint/Tactical Grid) across page reloads — a
 * per-browser display preference, not operational data, so localStorage
 * is the right store (same convention as the nav bar's collapsed state).
 * Leaflet's L.Control.Layers has no public API to activate a named base
 * layer from outside itself, so restoring the saved choice drives its
 * radio input directly in the rendered control DOM — the same kind of
 * direct-DOM escape hatch this file already uses elsewhere (see
 * TacticalBlueprintPane's pane z-index writes). */
function RestoreBaseLayer() {
  const map = useMap();

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(BASE_LAYER_STORAGE_KEY);
    } catch {
      // Private browsing / blocked site data — fall back to whichever
      // base layer is already showing (the JSX-declared default).
    }
    if (!saved) return;

    // The control's DOM renders on mount but this effect can still win
    // the race on a slow first paint — retry a couple of times.
    let attempts = 0;
    const tryRestore = () => {
      attempts += 1;
      const labels = map
        .getContainer()
        .querySelectorAll<HTMLLabelElement>(".leaflet-control-layers-base label");
      for (const label of labels) {
        if (label.textContent?.trim() === saved) {
          const input = label.querySelector<HTMLInputElement>("input[type=radio]");
          if (input && !input.checked) input.click();
          return;
        }
      }
      if (attempts < 5) setTimeout(tryRestore, 100);
    };
    const timeout = setTimeout(tryRestore, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMapEvent("baselayerchange", (e) => {
    try {
      localStorage.setItem(BASE_LAYER_STORAGE_KEY, e.name);
    } catch {
      // Same private-browsing/blocked-storage fallback as above — the
      // layer switch itself still works, it just won't be remembered.
    }
  });

  return null;
}

/** Reports whether the "Threat Categorization" overlay is currently
 * checked — Leaflet fires overlayadd/overlayremove on the map whenever any
 * overlay's checkbox is toggled via the control, so this just filters
 * those events down to the one layer the Legend cares about. Must be
 * rendered as a MapContainer descendant (needs useMapEvent). */
function ThreatCategorizationVisibilityTracker({ onChange }: { onChange: (visible: boolean) => void }) {
  useMapEvent("overlayadd", (e) => {
    if (e.name === "Threat Categorization") onChange(true);
  });
  useMapEvent("overlayremove", (e) => {
    if (e.name === "Threat Categorization") onChange(false);
  });
  return null;
}

const CATEGORY_ORDER = ["Red", "Orange", "Yellow", "Green"] as const;

/** BFT-style HUD legend: category swatches with live counts, overlaid on the
 * map rather than pushed into the surrounding page layout. */
function Legend({ counts, total }: { counts: Record<string, number>; total: number }) {
  return (
    <div className="pointer-events-none absolute top-2 right-2 z-[1000] flex flex-col gap-1 rounded-md border border-primary/30 bg-card/90 px-3 py-2 shadow-[0_0_16px_-4px_var(--primary)] backdrop-blur-sm">
      <div className="font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        Threat Categorization
      </div>
      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="flex items-center gap-2 text-xs">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: HOTSPOT_COLORS[cat] }}
          />
          <span className="flex-1 text-muted-foreground">{cat}</span>
          <span className="font-mono font-medium tabular-nums">{counts[cat] ?? 0}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: DEFAULT_COLOR }} />
        <span className="flex-1 text-muted-foreground">Unclassified</span>
        <span className="font-mono font-medium tabular-nums">{counts.Unclassified ?? 0}</span>
      </div>
      <div className="mt-1 border-t border-border/60 pt-1 text-[10px] text-muted-foreground">
        {total.toLocaleString()} areas mapped
      </div>
    </div>
  );
}

const CATEGORY_SELECT_ITEMS = [
  { value: "__none__", label: "Unclassified" },
  ...CATEGORY_ORDER.map((c) => ({ value: c, label: c })),
];

/** Floating panel opened by clicking a writable barangay on the
 * categorization layer — lets a JTF (for its own AOR) or ADMIN set that
 * barangay's hotspot category directly from the map, instead of having to
 * go find its row on the Election Status page. Only ever rendered for an
 * area whose jtfId is in `writableJtfIds` (see styleBarangay/onEachBarangay
 * below) — the PATCH route re-checks the same permission server-side
 * regardless. */
function CategoryEditPanel({
  area,
  onClose,
  onSaved,
}: {
  area: { id: string; label: string; hotspotCategory: string | null };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(area.hotspotCategory ?? "__none__");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/election-areas/${area.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotspotCategory: value === "__none__" ? null : value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Update failed");
      }
      toast.success("Category updated");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-[1000] flex w-64 flex-col gap-2 rounded-md border border-primary/30 bg-card/95 p-3 shadow-[0_0_16px_-4px_var(--primary)] backdrop-blur-sm">
      <div className="text-xs font-medium">{area.label}</div>
      <Select items={CATEGORY_SELECT_ITEMS} value={value} onValueChange={(v) => setValue(v ?? "__none__")}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_SELECT_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

/** Renders the per-activity-type checklist as genuinely indented children
 * directly inside Leaflet's own layers control, immediately under the
 * "Enemy Activity" row — react-leaflet's LayersControl has no API for
 * nested/grouped overlays (Leaflet's native control is one flat list), so
 * this finds "Enemy Activity"'s own rendered <label> and portals a real
 * checkbox list into a container inserted right after it.
 *
 * Leaflet's control doesn't just append new rows — on certain redraws
 * (adding/removing an overlay, which the per-JTF layers and the 20s
 * router.refresh() poll both do) it calls `empty()` on the whole overlays
 * list and rebuilds every row from scratch, which silently deletes any
 * DOM Leaflet doesn't own itself, including a container inserted this
 * way. A MutationObserver on that list re-inserts it every time that
 * happens, instead of a one-shot attach that only ever survives until
 * the next redraw.
 *
 * Each checkbox here drives React state (enabledActivityTypes) rather
 * than its own separate Leaflet layer — only one real layer ("Enemy
 * Activity" itself) is ever added to the map, so a type being checked
 * both here and as part of the whole group can never double-render the
 * same marker. Must be rendered as a MapContainer descendant (needs
 * useMap()). */
function EnemyActivityTypeFilter({
  types,
  enabled,
  onToggleType,
}: {
  types: Map<string, IntelMarker[]>;
  enabled: Set<string> | null;
  onToggleType: (type: string) => void;
}) {
  const map = useMap();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const hasTypes = types.size > 0;

  useEffect(() => {
    if (!hasTypes) return;

    const overlaysList = map.getContainer().querySelector<HTMLElement>(".leaflet-control-layers-overlays");
    if (!overlaysList) return;

    let current: HTMLDivElement | null = null;

    function attach() {
      if (current && overlaysList!.contains(current)) return;
      const labels = overlaysList!.querySelectorAll<HTMLLabelElement>("label");
      for (const label of labels) {
        if (label.textContent?.trim() === "Enemy Activity") {
          current = document.createElement("div");
          label.insertAdjacentElement("afterend", current);
          setPortalTarget(current);
          return;
        }
      }
    }

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(overlaysList, { childList: true });
    return () => {
      observer.disconnect();
      current?.remove();
    };
  }, [hasTypes, map]);

  if (!portalTarget || !hasTypes) return null;

  return createPortal(
    <div className="flex flex-col gap-1 py-1 pl-6">
      {[...types.entries()].map(([type, markers]) => {
        const checked = enabled === null || enabled.has(type);
        return (
          <label key={type} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="size-3.5 rounded border-border accent-primary"
              checked={checked}
              onChange={() => onToggleType(type)}
            />
            <span className="flex-1">{type}</span>
            <span className="font-mono font-semibold text-muted-foreground">
              — <span className="text-status-critical">{markers.length}</span>
            </span>
          </label>
        );
      })}
    </div>,
    portalTarget
  );
}

/** Tracks the map's current zoom so marker icons can shrink as it zooms
 * out — must be rendered as a MapContainer descendant to reach useMap(). */
function useCurrentZoom(): number {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvent("zoomend", () => setZoom(map.getZoom()));
  return zoom;
}

/** Point markers for areas with lat/lng that didn't get a matching (or
 * spatially-contained) polygon. CircleMarker's radius is in screen pixels,
 * not meters, so without zoom-based scaling a handful of these near each
 * other read fine zoomed in but balloon into giant overlapping blobs when
 * the map is zoomed out to show all of BARMM — same shrink-with-zoom curve
 * already used for incident/intel marker icons, just applied to a radius
 * instead of an icon size. */
function UnmatchedAreaMarkers({ areas }: { areas: (ScoredArea & { lat: number; lng: number })[] }) {
  const zoom = useCurrentZoom();
  const zoomScale = iconSizeForZoom(zoom) / MAX_ICON_SIZE;

  return (
    <>
      {areas.map((area) => {
        const color = area.hotspotCategory
          ? (HOTSPOT_COLORS[area.hotspotCategory] ?? DEFAULT_COLOR)
          : DEFAULT_COLOR;
        // Capped rather than scaling straight off priority score — a
        // handful of these landing close together (common in a dense
        // barangay cluster) no longer balloon into a solid overlapping
        // blob at typical zoom levels. Dashed white outline marks these
        // as "no boundary on file" pins, visually distinct from the
        // solid-filled matched polygons underneath rather than reading
        // as a duplicate of them.
        const baseRadius = Math.min(6 + Math.max(0, area.priorityScore) * 1.2, 12);
        const radius = Math.max(3, baseRadius * zoomScale);
        const label = [area.barangay, area.municipality, area.province].filter(Boolean).join(", ");

        return (
          <CircleMarker
            key={area.id}
            center={[area.lat, area.lng]}
            radius={radius}
            pathOptions={{
              color: "#f8fafc",
              weight: 1.5,
              dashArray: "3,2",
              fillColor: color,
              fillOpacity: 0.75,
            }}
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
    </>
  );
}

/** Shared marker rendering for every JTF's "Logged Incidents" overlay —
 * same popup/edit/delete behavior regardless of whether the incident was
 * entered via the plain Log Incident form or the map's own Add Marker
 * click (both count as logged for their JTF; `source` is provenance only,
 * not a display split). */
function IncidentMarkerItems({
  markers,
  jtfOptions,
  areaOptions,
}: {
  markers: IncidentMarker[];
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
}) {
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
              {marker.areaLabel && <div>{marker.areaLabel}</div>}
              {marker.result && <div>Result: {marker.result}</div>}
              {marker.canModify && (
                <div className="mt-2 flex gap-1 border-t border-border pt-2">
                  <IncidentMarkerFormDialog
                    jtfOptions={jtfOptions}
                    areaOptions={areaOptions}
                    lockJtfId={marker.jtfId}
                    initial={{
                      id: marker.id,
                      electionAreaId: marker.electionAreaId ?? undefined,
                      lat: marker.lat,
                      lng: marker.lng,
                      date: marker.date.slice(0, 10),
                      type: marker.type,
                      result: marker.result ?? "",
                      markerStyle: marker.markerStyle,
                    }}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <DeleteButton
                    url={`/api/incidents/${marker.id}`}
                    confirmMessage="Delete this incident marker? This cannot be undone."
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

// Enemy Activity layer (sourced from Intelligence Update reports) — same pulse/blink pipeline as
// IncidentMarkerItems (isLatestIncident/buildIncidentIcon), just a
// different color per category and a read-only popup (editing happens on
// the Intelligence Update page, not from the map). Only ADMIN/COMMAND/WFC
// Intelligence ever receive a non-empty `markers` list here — see
// getIntelMarkers, which returns [] for everyone else.
const INTEL_CATEGORY_COLOR: Record<IntelMarker["category"], string> = {
  VIOLENT: "var(--status-critical)",
  NON_VIOLENT: "var(--status-warning)",
};

function IntelMarkerItems({ markers }: { markers: IntelMarker[] }) {
  const zoom = useCurrentZoom();
  return (
    <>
      {markers.map((marker) => {
        const isRecent = isLatestIncident(marker.createdAt);
        return (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={buildIncidentIcon(
              isRecent ? "PULSE" : "NONE",
              zoom,
              INTEL_CATEGORY_COLOR[marker.category]
            )}
            zIndexOffset={isRecent ? 1000 : 0}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-medium">
                  {marker.activityType ??
                    (marker.category === "VIOLENT" ? "Violent" : "Non-Violent") + " Activity"}
                </div>
                <div>{marker.narrative}</div>
                {marker.threatGroup && <div>Threat group: {marker.threatGroup}</div>}
                <div>{marker.province}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function PriorityMap({
  areas,
  markers,
  intelMarkers,
  jtfOptions,
  areaOptions,
  lockJtfId,
  canCreateMarker,
  writableJtfIds,
}: {
  areas: ScoredArea[];
  markers: IncidentMarker[];
  intelMarkers: IntelMarker[];
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  lockJtfId?: string;
  canCreateMarker: boolean;
  writableJtfIds: string[];
}) {
  const router = useRouter();
  const [provinces, setProvinces] = useState<GeoJSON.FeatureCollection | null>(null);
  const [barangays, setBarangays] = useState<GeoJSON.FeatureCollection | null>(null);
  const [editingArea, setEditingArea] = useState<{
    id: string;
    label: string;
    hotspotCategory: string | null;
  } | null>(null);
  // Threat Categorization starts unchecked (see the Overlay below) — both
  // the barangay boundary layer and this legend stay hidden until someone
  // actively turns that layer on themselves, rather than showing by
  // default on every page load.
  const [threatLayerVisible, setThreatLayerVisible] = useState(false);

  // Another JTF's hotspot-category edit on the Election Status page (or
  // this one's own, from a different tab) doesn't push to this page —
  // periodically re-pull fresh server data so a boundary's color catches
  // up without anyone having to manually reload the Situation Map.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    fetch("/barmm-provinces.geojson")
      .then((res) => res.json())
      .then(setProvinces)
      .catch(() => setProvinces(null));
    fetch("/barmm-barangays.geojson")
      .then((res) => res.json())
      .then(setBarangays)
      .catch(() => setBarangays(null));
  }, []);

  // Every incident counts as "logged" for its JTF on the map regardless of
  // which flow created it (plain Log Incident form vs the map's own Add
  // Marker click) — one layer per JTF, not a separate source-based split,
  // so nothing can render twice across two different layers at once. A
  // just-created incident still stands out via its own pulse animation
  // (see isLatestIncident/buildIncidentIcon) rather than a separate layer.
  const loggedIncidentsByJtf = useMemo(() => {
    const map = new Map<string, IncidentMarker[]>();
    for (const marker of markers) {
      const list = map.get(marker.jtfId) ?? [];
      list.push(marker);
      map.set(marker.jtfId, list);
    }
    return map;
  }, [markers]);

  // Grouped by distinct activity type (e.g. "Campaign Rally", "Ambush") —
  // feeds the Enemy Activity Types sub-panel's checklist below, rather
  // than each type getting its own entry in the main layer list (that
  // read as cluttered once there were more than a couple of types).
  // Sorted so the checklist has a stable order across renders rather than
  // shuffling with whatever order the query happened to return rows in.
  const intelMarkersByActivityType = useMemo(() => {
    const map = new Map<string, IntelMarker[]>();
    for (const marker of intelMarkers) {
      const key = marker.activityType?.trim() || "Unspecified";
      const list = map.get(key) ?? [];
      list.push(marker);
      map.set(key, list);
    }
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [intelMarkers]);

  // null = every type visible (the default, before anyone touches the
  // sub-panel). Once touched it becomes an explicit allow-list, so a type
  // that shows up later (a new activity type someone logs) doesn't
  // silently disappear just because it wasn't in the set yet — only
  // reconsidered against `null` at the top of the filter below.
  const [enabledActivityTypes, setEnabledActivityTypes] = useState<Set<string> | null>(null);

  const visibleIntelMarkers = useMemo(() => {
    if (enabledActivityTypes === null) return intelMarkers;
    return intelMarkers.filter((m) => enabledActivityTypes.has(m.activityType?.trim() || "Unspecified"));
  }, [intelMarkers, enabledActivityTypes]);

  function toggleActivityType(type: string) {
    setEnabledActivityTypes((prev) => {
      const current = prev ?? new Set(intelMarkersByActivityType.keys());
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const areaByKey = useMemo(() => {
    const map = new Map<string, ScoredArea>();
    for (const area of areas) {
      map.set(areaKey(area.province, area.municipality, area.barangay), area);
    }
    return map;
  }, [areas]);

  // Every (province, municipality, barangay) name that actually exists as
  // a polygon in the boundary file — used to tell "this area's name isn't
  // in the file at all" apart from "this area's name IS in the file, it
  // just happens to also be every area's own key in areaByKey" (which is
  // trivially true for every area and so useless for that check).
  const polygonKeys = useMemo(() => {
    const set = new Set<string>();
    if (!barangays) return set;
    for (const feature of barangays.features) {
      const p = feature.properties as
        | { province?: string; municipality?: string | null; barangay?: string }
        | undefined;
      if (p) set.add(areaKey(p.province, p.municipality, p.barangay));
    }
    return set;
  }, [barangays]);

  // Fallback for areas whose (province, municipality, barangay) string
  // doesn't exactly match this boundary file's naming — rather than fall
  // straight to a floating point marker, check whether the area's actual
  // lat/lng lands inside one of the file's polygons that no other area's
  // name already claimed. That still colors the real boundary shape (using
  // this area's own category) instead of a dot sitting on top of it.
  // Keyed by the polygon's own areaKey, same as the exact-name lookup.
  const spatialFallback = useMemo(() => {
    const map = new Map<string, ScoredArea>();
    if (!barangays) return map;

    const assigned = new Set<string>();
    const candidates = areas.filter(
      (a) =>
        a.lat != null &&
        a.lng != null &&
        !(a.lat === 0 && a.lng === 0) &&
        !polygonKeys.has(areaKey(a.province, a.municipality, a.barangay))
    );
    if (candidates.length === 0) return map;

    for (const feature of barangays.features) {
      const p = feature.properties as
        | { province?: string; municipality?: string | null; barangay?: string }
        | undefined;
      if (!p) continue;
      const key = areaKey(p.province, p.municipality, p.barangay);
      if (areaByKey.has(key)) continue; // already colored by an exact name match

      const hit = candidates.find(
        (a) => !assigned.has(a.id) && pointInGeometry([a.lng as number, a.lat as number], feature.geometry)
      );
      if (hit) {
        map.set(key, hit);
        assigned.add(hit.id);
      }
    }
    return map;
  }, [barangays, areas, areaByKey, polygonKeys]);

  const resolveAreaForFeature = useCallback(
    (
      p: { province?: string; municipality?: string | null; barangay?: string } | undefined
    ): ScoredArea | undefined => {
      if (!p) return undefined;
      const key = areaKey(p.province, p.municipality, p.barangay);
      return areaByKey.get(key) ?? spatialFallback.get(key);
    },
    [areaByKey, spatialFallback]
  );

  const matchedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!barangays) return ids;
    for (const feature of barangays.features) {
      const p = feature.properties as
        | { province?: string; municipality?: string | null; barangay?: string }
        | undefined;
      const area = resolveAreaForFeature(p);
      if (area) ids.add(area.id);
    }
    return ids;
  }, [barangays, resolveAreaForFeature]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const area of areas) {
      if (area.hotspotCategory) {
        counts[area.hotspotCategory] = (counts[area.hotspotCategory] ?? 0) + 1;
      }
    }
    return counts;
  }, [areas]);

  // react-leaflet's <GeoJSON> doesn't reliably restyle already-rendered
  // layers when only the `style`/`onEachFeature` closures change (the
  // `data` object itself is stable — fetched once, see below) — force a
  // remount via `key` instead, but keyed on a signature of the actual
  // per-area category values rather than just `areas.length`, so an edit
  // that changes a category without changing the area count still
  // triggers a restyle.
  const categorizationSignature = useMemo(
    () => areas.map((a) => `${a.id}:${a.hotspotCategory ?? ""}`).join("|"),
    [areas]
  );

  function styleBarangay(feature?: GeoJSON.Feature): L.PathOptions {
    const p = feature?.properties as
      | { province?: string; municipality?: string | null; barangay?: string }
      | undefined;
    const area = resolveAreaForFeature(p);
    const color = area?.hotspotCategory
      ? (HOTSPOT_COLORS[area.hotspotCategory] ?? DEFAULT_COLOR)
      : DEFAULT_COLOR;
    const editable = !!area && writableJtfIds.includes(area.jtfId);
    return {
      color,
      weight: 1,
      fillColor: color,
      fillOpacity: area?.hotspotCategory ? 0.45 : 0.1,
      className: editable ? "cursor-pointer" : undefined,
    };
  }

  function onEachBarangay(feature: GeoJSON.Feature, layer: L.Layer) {
    const p = feature.properties as
      | { province?: string; municipality?: string | null; barangay?: string }
      | undefined;
    if (!p) return;
    const key = areaKey(p.province, p.municipality, p.barangay);
    const area = resolveAreaForFeature(p);
    const matchedByLocation = !!area && !areaByKey.has(key);
    const label = [p.barangay, p.municipality, p.province].filter(Boolean).join(", ");
    const editable = !!area && writableJtfIds.includes(area.jtfId);

    const lines = [`<div class="font-medium">${label}</div>`];
    if (area) {
      lines.push(`<div>Hotspot: ${area.hotspotCategory ?? "unclassified"}</div>`);
      lines.push(`<div>Priority score: ${area.priorityScore.toFixed(1)}</div>`);
      lines.push(`<div>Recent incidents (30d): ${area.recentIncidentCount}</div>`);
      lines.push(`<div>Deployed: ${area.deployedToPolling}</div>`);
      if (matchedByLocation) {
        lines.push(`<div class="italic">Matched by location — name on file doesn't match this boundary</div>`);
      }
      if (editable) lines.push(`<div class="italic">Click to set category</div>`);
    } else {
      lines.push(`<div>No categorization data on file.</div>`);
    }
    layer.bindTooltip(`<div class="text-xs">${lines.join("")}</div>`, { sticky: true });

    layer.on("mouseover", () => {
      (layer as L.Path).setStyle({ weight: 2.5, fillOpacity: 0.65 });
    });
    layer.on("mouseout", () => {
      (layer as L.Path).setStyle(styleBarangay(feature));
    });

    if (editable && area) {
      layer.on("click", () => {
        setEditingArea({ id: area.id, label, hotspotCategory: area.hotspotCategory });
      });
    }
  }

  // Areas with lat/lng that didn't get a matching polygon (e.g. a manually
  // added area without an official barangay boundary) still get a point
  // marker, so nothing with coordinates silently disappears from the map.
  // (0, 0) is never a real BARMM location — it's what a never-geocoded
  // row looks like — so it's treated the same as "no coordinates" here
  // rather than plotted off the coast of Africa.
  const unmatchedPlottable = areas.filter(
    (area): area is ScoredArea & { lat: number; lng: number } =>
      area.lat != null &&
      area.lng != null &&
      !(area.lat === 0 && area.lng === 0) &&
      !matchedIds.has(area.id)
  );

  return (
    // `isolate` scopes Leaflet's internal pane z-indices (tiles/tooltips/
    // popups go up to z-index 700) into their own stacking context, so
    // they can never out-rank the Add Marker dialog — a React portal
    // rendered at document.body with only z-50 — in the page's root
    // stacking order.
    <div className="relative isolate">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-[650px] w-full rounded-md border bg-muted"
        scrollWheelZoom
      >
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer attribution={SATELLITE_ATTRIBUTION} url={SATELLITE_TILE_URL} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Light Canvas">
            <LayerGroup>
              <TileLayer attribution={LIGHT_CANVAS_ATTRIBUTION} url={LIGHT_CANVAS_BASE_URL} />
              <TileLayer url={LIGHT_CANVAS_REFERENCE_URL} />
            </LayerGroup>
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Tactical Blueprint">
            <LayerGroup>
              <TacticalBlueprintPane />
              <TileLayer url={DARK_CANVAS_REFERENCE_URL} pane={TACTICAL_BLUEPRINT_GLOW_PANE} />
              <TileLayer
                attribution={DARK_CANVAS_ATTRIBUTION}
                url={DARK_CANVAS_BASE_URL}
                pane={TACTICAL_BLUEPRINT_PANE}
              />
              <TileLayer url={DARK_CANVAS_REFERENCE_URL} pane={TACTICAL_BLUEPRINT_PANE} />
            </LayerGroup>
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Tactical Grid (Offline)">
            <LayerGroup />
          </LayersControl.BaseLayer>

          {provinces && (
            <LayersControl.Overlay name="Province Outline">
              <LayerGroup>
                <GeoJSON data={provinces} style={PROVINCE_STYLE} onEachFeature={ProvinceLabel} />
              </LayerGroup>
            </LayersControl.Overlay>
          )}
          {barangays && (
            <LayersControl.Overlay name="Threat Categorization">
              <LayerGroup>
                <GeoJSON
                  key={categorizationSignature}
                  data={barangays}
                  style={styleBarangay}
                  onEachFeature={onEachBarangay}
                />
                <UnmatchedAreaMarkers areas={unmatchedPlottable} />
              </LayerGroup>
            </LayersControl.Overlay>
          )}
          {jtfOptions.map((jtf) => {
            // Always offer every JTF as a toggleable layer — even one with
            // no logged incidents yet still needs to appear in the control,
            // both so the full JTF roster is visible at a glance and so the
            // toggle is already there once that JTF logs its first one.
            const jtfMarkers = loggedIncidentsByJtf.get(jtf.id) ?? [];
            return (
              <LayersControl.Overlay checked key={jtf.id} name={`Logged Incidents — ${jtf.name}`}>
                <LayerGroup>
                  <IncidentMarkerItems
                    markers={jtfMarkers}
                    jtfOptions={jtfOptions}
                    areaOptions={areaOptions}
                  />
                </LayerGroup>
              </LayersControl.Overlay>
            );
          })}
          {intelMarkers.length > 0 && (
            <LayersControl.Overlay checked name="Enemy Activity">
              <LayerGroup>
                <IntelMarkerItems markers={visibleIntelMarkers} />
              </LayerGroup>
            </LayersControl.Overlay>
          )}
        </LayersControl>
        {provinces && <FitToBounds data={provinces} />}
        <RestoreBaseLayer />
        <ThreatCategorizationVisibilityTracker onChange={setThreatLayerVisible} />
        <EnemyActivityTypeFilter
          types={intelMarkersByActivityType}
          enabled={enabledActivityTypes}
          onToggleType={toggleActivityType}
        />
      </MapContainer>
      <HudFrame />
      {threatLayerVisible && <Legend counts={categoryCounts} total={areas.length} />}
      {editingArea && (
        <CategoryEditPanel
          area={editingArea}
          onClose={() => setEditingArea(null)}
          onSaved={() => {
            setEditingArea(null);
            router.refresh();
          }}
        />
      )}
      {canCreateMarker && (
        <div className="absolute bottom-3 left-3 z-[900]">
          <IncidentMarkerFormDialog
            jtfOptions={jtfOptions}
            areaOptions={areaOptions}
            lockJtfId={lockJtfId}
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

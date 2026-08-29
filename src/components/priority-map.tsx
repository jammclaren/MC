"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  CircleMarker,
  GeoJSON,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvent,
} from "react-leaflet";
import type { ScoredArea } from "@/lib/queries/priority-areas";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import {
  IncidentMarkerFormDialog,
  type ElectionAreaOption,
  type JtfOption,
} from "@/components/incident-marker-form-dialog";
import { buildIncidentIcon, isLatestIncident } from "@/lib/incident-marker-icon";
import {
  TacticalBlueprintPane,
  TACTICAL_BLUEPRINT_PANE,
  TACTICAL_BLUEPRINT_GLOW_PANE,
} from "@/components/tactical-blueprint-pane";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
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

// Decorative topographic-style contour rings, not real elevation data —
// each province outline scaled inward toward its own centroid a few times,
// for the "hologram terrain" read of a Blue Force Tracking display.
const CONTOUR_SCALES = [0.93, 0.85, 0.77, 0.69];
type LatLngPair = [number, number];

function ringCentroid(ring: number[][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const [lng, lat] of ring) {
    x += lng;
    y += lat;
  }
  return [x / ring.length, y / ring.length];
}

function scaleRing(ring: number[][], center: [number, number], scale: number): LatLngPair[] {
  const [cx, cy] = center;
  return ring.map(([lng, lat]) => [cy + (lat - cy) * scale, cx + (lng - cx) * scale]);
}

function buildContourRings(fc: GeoJSON.FeatureCollection): LatLngPair[][] {
  const rings: LatLngPair[][] = [];
  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    const polygons: number[][][][] =
      geom.type === "Polygon"
        ? [geom.coordinates as number[][][]]
        : geom.type === "MultiPolygon"
          ? (geom.coordinates as number[][][][])
          : [];
    for (const poly of polygons) {
      const outer = poly[0];
      if (!outer || outer.length < 4) continue;
      const center = ringCentroid(outer);
      for (const scale of CONTOUR_SCALES) {
        rings.push(scaleRing(outer, center, scale));
      }
    }
  }
  return rings;
}

function ContourRings({ data }: { data: GeoJSON.FeatureCollection }) {
  const rings = useMemo(() => buildContourRings(data), [data]);
  return (
    <>
      {rings.map((positions, i) => (
        <Polygon
          key={i}
          positions={positions}
          pathOptions={{
            color: "#22d3ee",
            weight: 1,
            opacity: 0.2,
            fill: false,
            interactive: false,
            className: "province-outline-glow",
          }}
        />
      ))}
    </>
  );
}

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
      <div className="mt-1 border-t border-border/60 pt-1 text-[10px] text-muted-foreground">
        {total.toLocaleString()} areas mapped
      </div>
    </div>
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

/** Shared marker rendering for both the "Incident Markers" (map-placed) and
 * "Logged Incidents" (plain Log Incident form) overlays — same popup/edit/
 * delete behavior either way, just filtered to a different `source`. */
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

export function PriorityMap({
  areas,
  markers,
  jtfOptions,
  areaOptions,
  lockJtfId,
  canCreateMarker,
}: {
  areas: ScoredArea[];
  markers: IncidentMarker[];
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  lockJtfId?: string;
  canCreateMarker: boolean;
}) {
  const [provinces, setProvinces] = useState<GeoJSON.FeatureCollection | null>(null);
  const [barangays, setBarangays] = useState<GeoJSON.FeatureCollection | null>(null);

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

  const mapPlacedMarkers = useMemo(
    () => markers.filter((m) => m.source === "MAP_MARKER"),
    [markers]
  );
  const loggedIncidentMarkers = useMemo(
    () => markers.filter((m) => m.source === "LOGGED"),
    [markers]
  );
  const loggedIncidentsByJtf = useMemo(() => {
    const map = new Map<string, IncidentMarker[]>();
    for (const marker of loggedIncidentMarkers) {
      const list = map.get(marker.jtfId) ?? [];
      list.push(marker);
      map.set(marker.jtfId, list);
    }
    return map;
  }, [loggedIncidentMarkers]);

  const areaByKey = useMemo(() => {
    const map = new Map<string, ScoredArea>();
    for (const area of areas) {
      map.set(areaKey(area.province, area.municipality, area.barangay), area);
    }
    return map;
  }, [areas]);

  const matchedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!barangays) return ids;
    for (const feature of barangays.features) {
      const p = feature.properties as
        | { province?: string; municipality?: string | null; barangay?: string }
        | undefined;
      const area = p && areaByKey.get(areaKey(p.province, p.municipality, p.barangay));
      if (area) ids.add(area.id);
    }
    return ids;
  }, [barangays, areaByKey]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const area of areas) {
      if (area.hotspotCategory) {
        counts[area.hotspotCategory] = (counts[area.hotspotCategory] ?? 0) + 1;
      }
    }
    return counts;
  }, [areas]);

  function styleBarangay(feature?: GeoJSON.Feature): L.PathOptions {
    const p = feature?.properties as
      | { province?: string; municipality?: string | null; barangay?: string }
      | undefined;
    const area = p && areaByKey.get(areaKey(p.province, p.municipality, p.barangay));
    const color = area?.hotspotCategory
      ? (HOTSPOT_COLORS[area.hotspotCategory] ?? DEFAULT_COLOR)
      : DEFAULT_COLOR;
    return {
      color,
      weight: 1,
      fillColor: color,
      fillOpacity: area?.hotspotCategory ? 0.45 : 0.1,
    };
  }

  function onEachBarangay(feature: GeoJSON.Feature, layer: L.Layer) {
    const p = feature.properties as
      | { province?: string; municipality?: string | null; barangay?: string }
      | undefined;
    if (!p) return;
    const area = areaByKey.get(areaKey(p.province, p.municipality, p.barangay));
    const label = [p.barangay, p.municipality, p.province].filter(Boolean).join(", ");

    const lines = [`<div class="font-medium">${label}</div>`];
    if (area) {
      lines.push(`<div>Hotspot: ${area.hotspotCategory ?? "unclassified"}</div>`);
      lines.push(`<div>Priority score: ${area.priorityScore.toFixed(1)}</div>`);
      lines.push(`<div>Recent incidents (30d): ${area.recentIncidentCount}</div>`);
      lines.push(`<div>Deployed: ${area.deployedToPolling}</div>`);
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
  }

  // Areas with lat/lng that didn't get a matching polygon (e.g. a manually
  // added area without an official barangay boundary) still get a point
  // marker, so nothing with coordinates silently disappears from the map.
  const unmatchedPlottable = areas.filter(
    (area): area is ScoredArea & { lat: number; lng: number } =>
      area.lat != null && area.lng != null && !matchedIds.has(area.id)
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
            <LayersControl.Overlay checked name="Province Outline">
              <LayerGroup>
                <GeoJSON data={provinces} style={PROVINCE_STYLE} onEachFeature={ProvinceLabel} />
              </LayerGroup>
            </LayersControl.Overlay>
          )}
          {provinces && (
            <LayersControl.Overlay checked name="Contour Rings">
              <LayerGroup>
                <ContourRings data={provinces} />
              </LayerGroup>
            </LayersControl.Overlay>
          )}
          {barangays && (
            <LayersControl.Overlay checked name="Threat Categorization">
              <LayerGroup>
                <GeoJSON
                  key={areas.length}
                  data={barangays}
                  style={styleBarangay}
                  onEachFeature={onEachBarangay}
                />
                {unmatchedPlottable.map((area) => {
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
              </LayerGroup>
            </LayersControl.Overlay>
          )}
          {jtfOptions.map((jtf) => {
            const jtfMarkers = loggedIncidentsByJtf.get(jtf.id);
            if (!jtfMarkers || jtfMarkers.length === 0) return null;
            return (
              <LayersControl.Overlay key={jtf.id} name={`Logged Incidents — ${jtf.name}`}>
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
          {mapPlacedMarkers.length > 0 && (
            <LayersControl.Overlay checked name="Incident Markers">
              <LayerGroup>
                <IncidentMarkerItems
                  markers={mapPlacedMarkers}
                  jtfOptions={jtfOptions}
                  areaOptions={areaOptions}
                />
              </LayerGroup>
            </LayersControl.Overlay>
          )}
        </LayersControl>
        {provinces && <FitToBounds data={provinces} />}
      </MapContainer>
      <HudFrame />
      <Legend counts={categoryCounts} total={areas.length} />
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

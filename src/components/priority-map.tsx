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
} from "react-leaflet";
import type { ScoredArea } from "@/lib/queries/priority-areas";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import {
  IncidentMarkerFormDialog,
  type ElectionAreaOption,
  type JtfOption,
} from "@/components/incident-marker-form-dialog";
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
  color: "#3987e5",
  weight: 1.5,
  fillColor: "#123a5c",
  fillOpacity: 0.3,
  interactive: false,
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
            color: "#3987e5",
            weight: 1,
            opacity: 0.2,
            fill: false,
            interactive: false,
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

/** Small animated dot icon for an incident marker — the animation class
 * (blink/pulse) is applied to the inner span, never the outer Leaflet
 * positioning wrapper, so it never fights Leaflet's own transform. */
function buildIncidentIcon(style: IncidentMarker["markerStyle"]): L.DivIcon {
  const animClass =
    style === "BLINK" ? "incident-marker-blink" : style === "PULSE" ? "incident-marker-pulse" : "";
  return L.divIcon({
    className: "incident-marker-icon",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:var(--status-critical);border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.7);" class="${animClass}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
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
          {markers.length > 0 && (
            <LayersControl.Overlay checked name="Incident Markers">
              <LayerGroup>
                {markers.map((marker) => (
                  <Marker
                    key={marker.id}
                    position={[marker.lat, marker.lng]}
                    icon={buildIncidentIcon(marker.markerStyle)}
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
                ))}
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

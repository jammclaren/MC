"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, CircleMarker, GeoJSON, Tooltip, useMap } from "react-leaflet";
import type { ScoredArea } from "@/lib/queries/priority-areas";

// No TileLayer is configured: this deployment target is air-gapped, so we
// don't depend on an online tile provider (SPEC.md §4). The province outline
// and barangay fills are static local GeoJSON files instead of online tiles
// — see public/barmm-provinces.geojson and public/barmm-barangays.geojson
// (source: faeldon/philippines-json-maps, MIT licensed). To swap in a
// different basemap later (self-hosted raster/vector tiles), add a
// <TileLayer> here instead; nothing else about this component would need
// to change.

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
  fillColor: "transparent",
  fillOpacity: 0,
  interactive: false,
};

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
    <div className="pointer-events-none absolute top-2 right-2 z-[1000] flex flex-col gap-1 rounded-md border border-border/60 bg-card/90 px-3 py-2 shadow-lg backdrop-blur-sm">
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

export function PriorityMap({ areas }: { areas: ScoredArea[] }) {
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
    <div className="relative">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-[650px] w-full rounded-md border bg-muted"
        scrollWheelZoom
      >
        {provinces && (
          <>
            <GeoJSON data={provinces} style={PROVINCE_STYLE} onEachFeature={ProvinceLabel} />
            <FitToBounds data={provinces} />
          </>
        )}
        {barangays && (
          <GeoJSON
            key={areas.length}
            data={barangays}
            style={styleBarangay}
            onEachFeature={onEachBarangay}
          />
        )}
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
      </MapContainer>
      <Legend counts={categoryCounts} total={areas.length} />
    </div>
  );
}

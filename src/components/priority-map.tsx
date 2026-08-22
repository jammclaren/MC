"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, CircleMarker, GeoJSON, Tooltip, useMap } from "react-leaflet";
import type { ScoredArea } from "@/lib/queries/priority-areas";

// No TileLayer is configured: this deployment target is air-gapped, so we
// don't depend on an online tile provider (SPEC.md §4). The province outline
// below is a static local GeoJSON file instead of online tiles — see
// public/barmm-provinces.geojson (source: faeldon/philippines-json-maps,
// MIT licensed; PSGC province boundaries for BARMM's 6 provinces + the
// Cotabato City/Isabela City special geographic area). To swap in a
// different basemap later (self-hosted raster/vector tiles), add a
// <TileLayer> here instead; nothing else about this component would need
// to change.

// Same validated status hex values as the Badge "good"/"warning"/"critical"
// variants (src/app/globals.css), so map markers and badges never disagree.
const HOTSPOT_COLORS: Record<string, string> = {
  Red: "#d03b3b",
  Yellow: "#fab219",
  Green: "#0ca30c",
};
const DEFAULT_COLOR = "#94a0ad";

// Rough BARMM/Western Mindanao center, used only until the province outline
// loads and the map fits to its actual bounds.
const DEFAULT_CENTER: [number, number] = [7.2, 124.2];
const DEFAULT_ZOOM = 8;

const PROVINCE_STYLE: L.PathOptions = {
  color: "#3987e5",
  weight: 1.5,
  fillColor: "#3987e5",
  fillOpacity: 0.05,
};

function ProvinceLabel(feature: GeoJSON.Feature, layer: L.Layer) {
  const name = feature.properties?.adm2_en;
  if (name) {
    layer.bindTooltip(name, { sticky: true, className: "text-xs" });
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

export function PriorityMap({ areas }: { areas: ScoredArea[] }) {
  const [provinces, setProvinces] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/barmm-provinces.geojson")
      .then((res) => res.json())
      .then(setProvinces)
      .catch(() => setProvinces(null));
  }, []);

  const plottable = areas.filter(
    (area): area is ScoredArea & { lat: number; lng: number } =>
      area.lat != null && area.lng != null
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-[500px] w-full rounded-md border bg-muted"
      scrollWheelZoom
    >
      {provinces && (
        <>
          <GeoJSON data={provinces} style={PROVINCE_STYLE} onEachFeature={ProvinceLabel} />
          <FitToBounds data={provinces} />
        </>
      )}
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

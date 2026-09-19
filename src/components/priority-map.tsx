"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  GeoJSON,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvent,
} from "react-leaflet";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import type { IntelMarker } from "@/lib/queries/intel-markers";
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
import { MapPin, Crosshair } from "lucide-react";

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

// Rough BARMM/Western Mindanao center, used only until the province outline
// loads and the map fits to its actual bounds.
const DEFAULT_CENTER: [number, number] = [7.2, 124.2];
const DEFAULT_ZOOM = 8;

const PROVINCE_STYLE: L.PathOptions = {
  color: "#2dd4bf",
  weight: 1.5,
  fillColor: "#123330",
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

/** Standalone icon control for the "Logged Enemy Activity" layer, kept out
 * of Leaflet's own multi-layer LayersControl (base layers + Province
 * Outline + per-JTF Logged Incidents) since enemy activity reads as a
 * distinct, higher-alert category of its own — a single red-outlined
 * icon, stacked directly under the layers control rather than buried as
 * one more row inside it.
 *
 * Portaled into Leaflet's own topleft control corner (`.leaflet-top.
 * leaflet-left`) as a sibling right after `.leaflet-control-layers`, so
 * it inherits Leaflet's native control spacing/stacking instead of
 * needing hand-rolled absolute positioning — same DOM-insertion approach
 * as the old per-type filter, including the MutationObserver, since nothing
 * guarantees this corner's children survive every Leaflet-internal
 * redraw. Must be rendered as a MapContainer descendant (needs useMap()). */
function EnemyActivityControl({
  visible,
  onToggleVisible,
  types,
  enabled,
  onToggleType,
  totalCount,
}: {
  visible: boolean;
  onToggleVisible: () => void;
  types: Map<string, IntelMarker[]>;
  enabled: Set<string> | null;
  onToggleType: (type: string) => void;
  totalCount: number;
}) {
  const map = useMap();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const corner = map.getContainer().querySelector<HTMLElement>(".leaflet-top.leaflet-left");
    if (!corner) return;

    let current: HTMLDivElement | null = null;

    function attach() {
      if (current && corner!.contains(current)) return;
      current = document.createElement("div");
      current.className = "leaflet-control";
      const layersControl = corner!.querySelector<HTMLElement>(".leaflet-control-layers");
      if (layersControl) {
        layersControl.insertAdjacentElement("afterend", current);
      } else {
        corner!.appendChild(current);
      }
      setPortalTarget(current);
    }

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(corner, { childList: true });
    return () => {
      observer.disconnect();
      current?.remove();
    };
  }, [map]);

  if (!portalTarget) return null;

  return createPortal(
    <div className="relative">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        title="Logged Enemy Activity"
        className="flex size-[30px] items-center justify-center rounded-[4px] border border-status-critical bg-card text-status-critical shadow-md transition-opacity hover:bg-accent"
        style={{ opacity: visible ? 1 : 0.45 }}
      >
        <Crosshair className="size-4" />
      </button>
      {expanded && (
        <div className="absolute top-0 left-[34px] z-[1000] w-56 rounded-md border border-status-critical/40 bg-card/95 p-2 text-xs shadow-lg backdrop-blur-sm">
          <label className="flex items-center gap-2 border-b border-border pb-2 font-medium">
            <input
              type="checkbox"
              className="size-3.5 rounded border-border accent-status-critical"
              checked={visible}
              onChange={onToggleVisible}
            />
            <span className="flex-1">Logged Enemy Activity</span>
            <span className="font-mono text-muted-foreground">{totalCount}</span>
          </label>
          {visible && types.size > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {[...types.entries()].map(([type, markers]) => {
                const checked = enabled === null || enabled.has(type);
                return (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-border accent-status-critical"
                      checked={checked}
                      onChange={() => onToggleType(type)}
                    />
                    <span className="flex-1">{type}</span>
                    <span className="font-mono font-semibold text-muted-foreground">
                      {markers.length}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
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
          // A recent (pulsing) incident marker must outrank a recent
          // (pulsing) Intel Update marker too — both use the same 1000
          // offset, so a tie falls back to pane insertion order, where
          // "Enemy Activity" (Intel) renders after Incidents and would
          // otherwise sit on top and hide the incident underneath it.
          zIndexOffset={isRecent ? 2000 : 0}
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
  markers,
  intelMarkers,
  jtfOptions,
  areaOptions,
  lockJtfId,
  canCreateMarker,
}: {
  markers: IncidentMarker[];
  intelMarkers: IntelMarker[];
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  lockJtfId?: string;
  canCreateMarker: boolean;
}) {
  const [provinces, setProvinces] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/barmm-provinces.geojson")
      .then((res) => res.json())
      .then(setProvinces)
      .catch(() => setProvinces(null));
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

  // Kept out of Leaflet's own LayersControl (see EnemyActivityControl) and
  // defaulted on, matching the old in-control checkbox's `checked` default.
  const [enemyActivityVisible, setEnemyActivityVisible] = useState(true);

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
        </LayersControl>
        {provinces && <FitToBounds data={provinces} />}
        <RestoreBaseLayer />
        {enemyActivityVisible && intelMarkers.length > 0 && (
          <LayerGroup>
            <IntelMarkerItems markers={visibleIntelMarkers} />
          </LayerGroup>
        )}
        {intelMarkers.length > 0 && (
          <EnemyActivityControl
            visible={enemyActivityVisible}
            onToggleVisible={() => setEnemyActivityVisible((v) => !v)}
            types={intelMarkersByActivityType}
            enabled={enabledActivityTypes}
            onToggleType={toggleActivityType}
            totalCount={intelMarkers.length}
          />
        )}
      </MapContainer>
      <HudFrame />
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

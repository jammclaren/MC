import L from "leaflet";
import type { IncidentMarker } from "@/lib/queries/incident-markers";

const LATEST_INCIDENT_WINDOW_MS = 60 * 60 * 1000;

/** Just-logged incidents pulse regardless of their stored markerStyle, so a
 * fresh report catches the eye on the map without anyone having to remember
 * to pick "Pulse" — it fades back to the chosen style after an hour. */
export function isLatestIncident(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= LATEST_INCIDENT_WINDOW_MS;
}

// Marker dots shrink as the map zooms out, so a cluster of nearby incidents
// reads as distinct points instead of a solid overlapping blob at wide
// zoom levels — full size from REFERENCE_ZOOM up, floors out at
// MIN_ICON_SIZE by MIN_ZOOM_FOR_SHRINK.
const REFERENCE_ZOOM = 12;
const MIN_ZOOM_FOR_SHRINK = 5;
const MAX_ICON_SIZE = 14;
const MIN_ICON_SIZE = 6;

function iconSizeForZoom(zoom: number | undefined): number {
  if (zoom == null || zoom >= REFERENCE_ZOOM) return MAX_ICON_SIZE;
  if (zoom <= MIN_ZOOM_FOR_SHRINK) return MIN_ICON_SIZE;
  const t = (zoom - MIN_ZOOM_FOR_SHRINK) / (REFERENCE_ZOOM - MIN_ZOOM_FOR_SHRINK);
  return Math.round(MIN_ICON_SIZE + t * (MAX_ICON_SIZE - MIN_ICON_SIZE));
}

/** Small animated dot icon for an incident marker — the animation class
 * (blink/pulse) is applied to the inner span, never the outer Leaflet
 * positioning wrapper, so it never fights Leaflet's own transform. Pass the
 * map's current zoom so the dot shrinks at wide zoom levels; omit it for
 * always-full-size (e.g. a legend swatch). */
export function buildIncidentIcon(style: IncidentMarker["markerStyle"], zoom?: number): L.DivIcon {
  const animClass =
    style === "BLINK" ? "incident-marker-blink" : style === "PULSE" ? "incident-marker-pulse" : "";
  const size = iconSizeForZoom(zoom);
  const half = size / 2;
  const border = size <= 9 ? 1 : 2;
  return L.divIcon({
    className: "incident-marker-icon",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:var(--status-critical);border:${border}px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.7);" class="${animClass}"></span>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

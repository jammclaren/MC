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

// Recent (pulsing) incidents render noticeably larger than older ones, so
// a fresh report stands out from the surrounding "previous incident" dots
// at a glance, on top of its own pulse animation.
const RECENT_SIZE_MULTIPLIER = 1.6;
const PREVIOUS_SIZE_MULTIPLIER = 0.7;

function pulseDotHtml(color: string): string {
  return `<span style="position:relative;display:block;width:100%;height:100%;border-radius:9999px;background:${color};box-shadow:0 0 6px rgba(0,0,0,0.7);"></span>`;
}

/** Small animated dot icon for an incident marker — the animation is
 * applied to inner elements, never the outer Leaflet positioning wrapper,
 * so it never fights Leaflet's own transform. Pass the map's current zoom
 * so the dot shrinks at wide zoom levels; omit it for always-full-size
 * (e.g. a legend swatch). `color` defaults to the incident-red used
 * everywhere today — pass a different CSS color (e.g. var(--status-warning))
 * for a non-incident layer that needs the same pulse/blink treatment in a
 * different hue, such as the Intelligence Update map layer's non-violent
 * vs violent split. */
export function buildIncidentIcon(
  style: IncidentMarker["markerStyle"],
  zoom?: number,
  color = "var(--status-critical)"
): L.DivIcon {
  const baseSize = iconSizeForZoom(zoom);

  if (style === "PULSE") {
    const size = Math.round(baseSize * RECENT_SIZE_MULTIPLIER);
    const half = size / 2;
    // A static dot with one soft, expanding-and-fading ring behind it —
    // a "live ping" pulse — rather than the dot itself scaling up and
    // down in place. The ring's own CSS class only supplies the animation;
    // its color is set inline so it can differ per marker/layer.
    const ringGradient = `radial-gradient(circle, ${color} 0%, ${color} 45%, transparent 72%)`;
    const html = `<span style="position:relative;display:block;width:${size}px;height:${size}px;">
      <span class="incident-marker-pulse-ring" style="background:${ringGradient};"></span>
      ${pulseDotHtml(color)}
    </span>`;
    return L.divIcon({
      className: "incident-marker-icon",
      html,
      iconSize: [size, size],
      iconAnchor: [half, half],
    });
  }

  const size = Math.max(4, Math.round(baseSize * PREVIOUS_SIZE_MULTIPLIER));
  const half = size / 2;
  const border = size <= 9 ? 1 : 2;
  const animClass = style === "BLINK" ? "incident-marker-blink" : "";
  return L.divIcon({
    className: "incident-marker-icon",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${border}px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.7);" class="${animClass}"></span>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

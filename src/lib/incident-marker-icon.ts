import L from "leaflet";
import type { IncidentMarker } from "@/lib/queries/incident-markers";

const LATEST_INCIDENT_WINDOW_MS = 60 * 60 * 1000;

/** Just-logged incidents pulse regardless of their stored markerStyle, so a
 * fresh report catches the eye on the map without anyone having to remember
 * to pick "Pulse" — it fades back to the chosen style after an hour. */
export function isLatestIncident(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= LATEST_INCIDENT_WINDOW_MS;
}

/** Small animated dot icon for an incident marker — the animation class
 * (blink/pulse) is applied to the inner span, never the outer Leaflet
 * positioning wrapper, so it never fights Leaflet's own transform. */
export function buildIncidentIcon(style: IncidentMarker["markerStyle"]): L.DivIcon {
  const animClass =
    style === "BLINK" ? "incident-marker-blink" : style === "PULSE" ? "incident-marker-pulse" : "";
  return L.divIcon({
    className: "incident-marker-icon",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:var(--status-critical);border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.7);" class="${animClass}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export const TACTICAL_BLUEPRINT_PANE = "tacticalBlueprint";
export const TACTICAL_BLUEPRINT_GLOW_PANE = "tacticalBlueprintGlow";

/** Creates the two dedicated Leaflet panes the "Tactical Blueprint" base
 * layer renders into: a blurred, brightened "glow" copy of the line-work
 * sitting just behind a crisp copy, so boundaries read as lit from
 * within rather than a flat recolor. TileLayer's `className` option only
 * reaches the layer's own container div, not each tile `<img>`, and CSS
 * `filter`/`blur` don't cascade through Leaflet's shared tile pane the
 * way a dedicated pane does — so each look lives in its own pane (see
 * .leaflet-tacticalBlueprint-pane / .leaflet-tacticalBlueprintGlow-pane
 * in globals.css) instead of every base layer sharing the default one. */
export function TacticalBlueprintPane() {
  const map = useMap();
  useEffect(() => {
    // Custom panes get no z-index by default and are appended after
    // Leaflet's built-ins, which would stack these base tiles above
    // markers/overlays — pin them just below/at the standard tile pane's
    // z-index (200) so they behave like any other base layer, with the
    // glow pane sitting one step behind the crisp pane.
    if (!map.getPane(TACTICAL_BLUEPRINT_GLOW_PANE)) {
      const glowPane = map.createPane(TACTICAL_BLUEPRINT_GLOW_PANE);
      glowPane.style.zIndex = "199";
      glowPane.style.pointerEvents = "none";
    }
    if (!map.getPane(TACTICAL_BLUEPRINT_PANE)) {
      const pane = map.createPane(TACTICAL_BLUEPRINT_PANE);
      pane.style.zIndex = "200";
    }
  }, [map]);
  return null;
}

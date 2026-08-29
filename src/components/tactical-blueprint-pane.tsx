"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export const TACTICAL_BLUEPRINT_PANE = "tacticalBlueprint";

/** Creates a dedicated Leaflet pane for the "Tactical Blueprint" base
 * layer's tiles. TileLayer's `className` option only reaches the layer's
 * own container div, not each tile `<img>`, and CSS `filter` doesn't
 * cascade through Leaflet's tile pane the way a dedicated pane does — so
 * the blue-tint filter (see .leaflet-tacticalBlueprint-pane in
 * globals.css) targets this pane instead, scoped to just these tiles
 * rather than every base layer sharing the default tile pane. */
export function TacticalBlueprintPane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane(TACTICAL_BLUEPRINT_PANE)) {
      const pane = map.createPane(TACTICAL_BLUEPRINT_PANE);
      // Custom panes get no z-index by default and are appended after
      // Leaflet's built-ins, which would stack these base tiles above
      // markers/overlays — pin it to the same z-index as the standard
      // tile pane so it behaves like any other base layer.
      pane.style.zIndex = "200";
    }
  }, [map]);
  return null;
}

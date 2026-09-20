export type AlertLevelCode = "WHITE" | "BLUE" | "RED";

export interface AlertLevelMeta {
  code: AlertLevelCode;
  label: string;
  phase: string;
  description: string;
  /** CSS color value. WHITE/RED reuse the app's existing foreground and
   * status-critical tokens; BLUE has no existing semantic token to reuse
   * (the theme's other blue-ish hues are already spoken for — primary is
   * teal, chart-5 is purple) so it's one deliberately-picked literal hex,
   * same tier as the status tokens it sits alongside. */
  color: string;
}

export const ALERT_LEVELS: Record<AlertLevelCode, AlertLevelMeta> = {
  WHITE: {
    code: "WHITE",
    label: "White Alert",
    phase: "Normal Posture",
    description: "Peacetime normal. Troops undergo routine training and operations.",
    color: "var(--foreground)",
  },
  BLUE: {
    code: "BLUE",
    label: "Blue Alert",
    phase: "Heightened Readiness",
    description:
      "50% of military personnel must remain inside camps and be ready to deploy for any immediate security contingency.",
    color: "#3b82f6",
  },
  RED: {
    code: "RED",
    label: "Red Alert",
    phase: "Maximum Readiness",
    description:
      "100% of troops are activated and restricted to base. Cancelled leaves are enforced, and units are placed in full battle gear to support civil authorities or counter a direct national threat.",
    color: "var(--status-critical)",
  },
};

export const ALERT_LEVEL_ORDER: AlertLevelCode[] = ["WHITE", "BLUE", "RED"];

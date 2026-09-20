/** The five categories a Unit Condition rating breaks down into, in the
 * fixed display order used across the admin form and the Overview
 * summary. */
export const UNIT_CONDITION_CATEGORIES = [
  { key: "personnelPct", label: "Personnel" },
  { key: "equipmentPct", label: "Equipment" },
  { key: "maintenancePct", label: "Maintenance" },
  { key: "facilityPct", label: "Facility" },
  { key: "trainingPct", label: "Training" },
] as const;

export type UnitConditionCategoryKey = (typeof UNIT_CONDITION_CATEGORIES)[number]["key"];

export interface UnitConditionRating {
  code: "R1" | "R2" | "R3" | "R4";
  label: string;
  /** CSS color value — the app's existing status/brand tokens, not a new
   * hardcoded palette. */
  color: string;
}

const RATINGS: UnitConditionRating[] = [
  { code: "R1", label: "Fully Mission Capable", color: "var(--status-good)" },
  { code: "R2", label: "Mission Capable", color: "var(--primary)" },
  { code: "R3", label: "Partially Mission Capable", color: "var(--status-warning)" },
  { code: "R4", label: "Not Mission Capable", color: "var(--status-critical)" },
];

/** Unit Status Report bands: R1 85-100%, R2 75-84%, R3 51-74%, R4 0-50%. */
export function ratingForPct(pct: number): UnitConditionRating {
  if (pct >= 85) return RATINGS[0];
  if (pct >= 75) return RATINGS[1];
  if (pct >= 51) return RATINGS[2];
  return RATINGS[3];
}

// Substring keywords (case-insensitive) used to flag a monitored incident's
// type as "armed/violent" for tactical wording and severity-mix breakdowns.
// This is a separate, plainer classification than INCIDENT_SEVERITY_WEIGHTS
// in priority-score.ts (which drives the numeric priority score) — this one
// just decides which incidents read as a violent-type callout.
export const VIOLENT_INCIDENT_KEYWORDS = [
  "shoot",
  "snip",
  "ambush",
  "strafing",
  "ied",
  "bomb",
  "grenade",
  "armed encounter",
  "kidnap",
];

export function isViolentIncidentType(type: string): boolean {
  const lower = type.toLowerCase();
  return VIOLENT_INCIDENT_KEYWORDS.some((kw) => lower.includes(kw));
}

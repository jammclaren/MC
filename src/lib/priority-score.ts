/**
 * MVP "areas to prioritize" heuristic (SPEC.md §8). Deliberately simple and
 * fully transparent — command staff can read this function top to bottom and
 * challenge any part of it. Not ML, not a black box.
 *
 * score = hotspotWeight + recentIncidentSeverity - deploymentCoverageDeduction
 */

export const HOTSPOT_WEIGHTS: Record<string, number> = {
  Red: 3,
  Orange: 2.5,
  Yellow: 2,
  Green: 1,
};

/** Threshold above which an area/incident is flagged as a priority in list
 * views — set equal to a plain Red hotspot with nothing else going on, so
 * "flagged" means "at least as urgent as a bare Red hotspot." */
export const PRIORITY_FLAG_THRESHOLD = HOTSPOT_WEIGHTS.Red;

/**
 * Per-incident-type severity weights. Unlisted types fall back to
 * DEFAULT_INCIDENT_WEIGHT. Keys are matched case-insensitively. Edit this map
 * to reflect how command staff actually want incident types weighted — it is
 * intentionally a plain, editable table rather than a learned model.
 */
export const INCIDENT_SEVERITY_WEIGHTS: Record<string, number> = {
  "armed encounter": 3,
  ambush: 3,
  ied: 3,
  kidnapping: 3,
  harassment: 2,
  intimidation: 2,
  threat: 2,
};

export const DEFAULT_INCIDENT_WEIGHT = 1;
export const RECENT_INCIDENT_WINDOW_DAYS = 30;

/** Deployment coverage (troops / registered voters) can subtract at most this
 * many points, so a single well-covered area can't out-rank every hotspot. */
export const MAX_COVERAGE_DEDUCTION = 3;
export const COVERAGE_DEDUCTION_SCALE = 10;

export interface PriorityScoreIncident {
  type: string;
  date: Date;
}

export interface PriorityScoreInput {
  hotspotCategory: string | null;
  /** Pass all known incidents for the area; this function filters to the
   * recent window itself so callers don't have to duplicate that logic. */
  incidents: PriorityScoreIncident[];
  deployedToPolling: number;
  registeredVoters: number | null;
  /** Reference "now" for the recent-incident window. Defaults to the current
   * time; pass an explicit value in tests for deterministic results. */
  asOf?: Date;
}

export function computePriorityScore(input: PriorityScoreInput): number {
  const asOf = input.asOf ?? new Date();
  const windowStart = new Date(
    asOf.getTime() - RECENT_INCIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const hotspotScore = input.hotspotCategory
    ? (HOTSPOT_WEIGHTS[input.hotspotCategory] ?? 0)
    : 0;

  const incidentScore = input.incidents
    .filter((incident) => incident.date >= windowStart && incident.date <= asOf)
    .reduce((sum, incident) => {
      const weight =
        INCIDENT_SEVERITY_WEIGHTS[incident.type.toLowerCase()] ??
        DEFAULT_INCIDENT_WEIGHT;
      return sum + weight;
    }, 0);

  // Guard against the #DIV/0! bug class the source spreadsheets are full of:
  // with no registered-voter figure, we cannot compute a coverage ratio, so
  // no deduction is applied rather than throwing or producing NaN/Infinity.
  const coverageRatio =
    input.registeredVoters && input.registeredVoters > 0
      ? input.deployedToPolling / input.registeredVoters
      : 0;
  const coverageDeduction = Math.min(
    coverageRatio * COVERAGE_DEDUCTION_SCALE,
    MAX_COVERAGE_DEDUCTION
  );

  return hotspotScore + incidentScore - coverageDeduction;
}

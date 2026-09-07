// Command-wide (or JTF-scoped, matching whatever OverviewData was scoped to)
// readiness-condition indicator, patterned after a DEFCON-style escalation
// ladder. Deterministic and derived only from numbers already computed by
// getOverviewData plus JTF assessment freshness — no sentiment/keyword
// analysis is run over assessment free text (same no-fabrication stance as
// daily-assessment.ts's module comment: a figure is either measured or the
// line is omitted, never guessed at from prose).
import { isViolentIncidentType } from "@/lib/incident-classification";
import type { OverviewData } from "@/lib/queries/overview";
import type { JtfAssessmentRow } from "@/lib/queries/jtf-assessments";

export type DefconLevel = 0 | 1 | 2 | 3 | 4;

// Reuses the app's existing 4-tier status palette (good/warning/serious/
// critical, see globals.css) rather than introducing a 5th hue — level 0
// and 1 share "good" (both read as the chart's green family); the level
// number and name text carry the finer distinction.
const TONE_BY_LEVEL: Record<DefconLevel, "good" | "warning" | "serious" | "critical"> = {
  0: "good",
  1: "good",
  2: "warning",
  3: "serious",
  4: "critical",
};

export function toneForDefconLevel(level: DefconLevel): "good" | "warning" | "serious" | "critical" {
  return TONE_BY_LEVEL[level];
}

export interface DefconStatus {
  level: DefconLevel;
  name: string;
  category: string;
  readiness: string;
  readinessActions: string;
  reasons: string[];
  assessmentCoverage: { reporting: number; total: number; mostRecentAt: string | null };
}

const LEVEL_META: Record<
  DefconLevel,
  { name: string; category: string; readiness: string; readinessActions: string }
> = {
  0: {
    name: "NORMAL",
    category: "STABLE / MANAGEABLE",
    readiness: "NORMAL READINESS",
    readinessActions: "Monitor · coordinate · sustain preparedness",
  },
  1: {
    name: "HEIGHTENED",
    category: "LOCALIZED DETERIORATION",
    readiness: "HEIGHTENED READINESS",
    readinessActions: "Increase engagement/monitoring · ALERT FOFs",
  },
  2: {
    name: "ELEVATED",
    category: "SIGNIFICANT DETERIORATION",
    readiness: "ELEVATED READINESS",
    readinessActions: "DEPLOY FOFs · reinforce vulnerable areas",
  },
  3: {
    name: "SEVERE",
    category: "HIGHLY UNSTABLE",
    readiness: "FULL OPERATIONAL READINESS",
    readinessActions: "PRE-POSITION forces/resources · target hardening",
  },
  4: {
    name: "CRITICAL",
    category: "MAJOR / SUSTAINED HOSTILITIES",
    readiness: "MAXIMUM READINESS",
    readinessActions: "Additional FOFs as necessary · protect populated/high-profile areas",
  },
};

// Priority-area count thresholds driving the base level — same source and
// spirit as daily-assessment.ts's severityFromPriorityAreas, just split one
// bucket finer to land on 5 levels (0-4) instead of its 4.
const LEVEL1_PRIORITY_AREAS = 10;
const LEVEL2_PRIORITY_AREAS = 50;
const LEVEL3_PRIORITY_AREAS = 120;
const LEVEL4_PRIORITY_AREAS = 200;

function baseLevelFromPriorityAreas(count: number): DefconLevel {
  if (count >= LEVEL4_PRIORITY_AREAS) return 4;
  if (count >= LEVEL3_PRIORITY_AREAS) return 3;
  if (count >= LEVEL2_PRIORITY_AREAS) return 2;
  if (count >= LEVEL1_PRIORITY_AREAS) return 1;
  return 0;
}

// Same 2-half comparison as daily-assessment.ts's incidentTrendFrom (kept
// local there, so re-derived here rather than importing a private helper).
function incidentTrendFrom(incidentsByDay: OverviewData["incidentsByDay"]) {
  const half = Math.floor(incidentsByDay.length / 2);
  const priorWeek = incidentsByDay.slice(0, half).reduce((s, d) => s + d.count, 0);
  const recentWeek = incidentsByDay.slice(half).reduce((s, d) => s + d.count, 0);
  if (recentWeek > priorWeek) return "increasing" as const;
  if (recentWeek < priorWeek) return "decreasing" as const;
  return "stable" as const;
}

export function computeDefconStatus(
  data: OverviewData,
  jtfAssessments: JtfAssessmentRow[] = []
): DefconStatus {
  let level = baseLevelFromPriorityAreas(data.priorityAreaCount);
  const reasons: string[] = [
    `${data.priorityAreaCount.toLocaleString()} area(s) at or above the Red-hotspot priority threshold.`,
  ];

  const trend = incidentTrendFrom(data.incidentsByDay);
  reasons.push(
    `${data.recentIncidentCount30d.toLocaleString()} incident(s) in the last 30 days; 14-day trend is ${trend}.`
  );
  if (trend === "increasing" && level < 4) {
    level = (level + 1) as DefconLevel;
    reasons.push("Escalated one level — 14-day incident trend is increasing.");
  }

  const violentRecent = data.recentIncidents.filter((i) => isViolentIncidentType(i.type));
  reasons.push(
    `${violentRecent.length} of the ${data.recentIncidents.length} most recently monitored incident(s) are violent-type.`
  );
  const violentShare =
    data.recentIncidents.length > 0 ? violentRecent.length / data.recentIncidents.length : 0;
  if (violentShare >= 0.5 && data.recentIncidents.length > 0 && level < 4) {
    level = (level + 1) as DefconLevel;
    reasons.push("Escalated one level — at least half of recently monitored incidents are violent-type.");
  }

  const jtfCount = data.jtfDeployments.length;
  const reportingJtfIds = new Set(jtfAssessments.map((a) => a.jtfId));
  const mostRecentAt = jtfAssessments[0]?.createdAt ?? null;

  const meta = LEVEL_META[level];
  return {
    level,
    name: meta.name,
    category: meta.category,
    readiness: meta.readiness,
    readinessActions: meta.readinessActions,
    reasons,
    assessmentCoverage: { reporting: reportingJtfIds.size, total: jtfCount, mostRecentAt },
  };
}

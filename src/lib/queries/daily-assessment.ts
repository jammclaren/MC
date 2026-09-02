import { safePercent } from "@/lib/percentages";
import { isViolentIncidentType } from "@/lib/incident-classification";
import { PROVINCE_TO_JTF } from "@/lib/queries/election-board";
import type { OverviewData } from "@/lib/queries/overview";

/**
 * Deterministic "Daily Analysis & Assessment" — every sentence here is a
 * template filled in with numbers already computed by getOverviewData, or a
 * fixed recommendation triggered by a plain threshold on those numbers.
 * Nothing is invented: if a number isn't available (e.g. no registered
 * voters on file yet), the line that depends on it is simply omitted rather
 * than guessed at. See SPEC.md/README for why this app avoids anything that
 * could fabricate an operational figure — an LLM-narrated version of this
 * panel was considered and deliberately not built for the same reason.
 *
 * The panel has two sources: this module's statistics-derived `analysis`,
 * and each JTF's own free-text "overall assessment" (see
 * jtf-assessments.ts) surfaced verbatim as `jtfAssessments` — never
 * rewritten or summarized, for the same no-fabrication reason.
 *
 * Recommendations are grouped into three planning echelons per command
 * guidance: Strategic (BARMM-wide posture and cross-JTF resourcing),
 * Operational (JTF/provincial coordination and BPE logistics), and Tactical
 * (specific areas and incident types drawn from monitored incidents).
 */

export type SeverityLevel = "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";

export interface RecommendationTiers {
  strategic: string[];
  operational: string[];
  tactical: string[];
}

export interface JtfAssessmentInput {
  jtfName: string;
  authorName: string;
  summary: string;
  createdAt: string;
}

export interface DailyAssessment {
  reportDate: string; // "27 August 2026"
  generatedAt: string; // ISO timestamp
  severityLevel: SeverityLevel;
  incidentTrend: "increasing" | "decreasing" | "stable";
  analysis: string[];
  jtfAssessments: JtfAssessmentInput[];
  recommendations: RecommendationTiers;
}

// Priority-area count thresholds for the overall severity call — plain,
// editable constants (same spirit as computePriorityScore), not a model.
const CRITICAL_PRIORITY_AREA_THRESHOLD = 200;
const ELEVATED_PRIORITY_AREA_THRESHOLD = 50;
const MODERATE_PRIORITY_AREA_THRESHOLD = 10;

function severityFromPriorityAreas(priorityAreaCount: number): SeverityLevel {
  if (priorityAreaCount >= CRITICAL_PRIORITY_AREA_THRESHOLD) return "CRITICAL";
  if (priorityAreaCount >= ELEVATED_PRIORITY_AREA_THRESHOLD) return "ELEVATED";
  if (priorityAreaCount >= MODERATE_PRIORITY_AREA_THRESHOLD) return "MODERATE";
  return "LOW";
}

function incidentTrendFrom(incidentsByDay: OverviewData["incidentsByDay"]) {
  const half = Math.floor(incidentsByDay.length / 2);
  const priorWeek = incidentsByDay.slice(0, half).reduce((s, d) => s + d.count, 0);
  const recentWeek = incidentsByDay.slice(half).reduce((s, d) => s + d.count, 0);
  if (recentWeek > priorWeek) return "increasing" as const;
  if (recentWeek < priorWeek) return "decreasing" as const;
  return "stable" as const;
}

function daysRemaining(endIso: string): number | null {
  const end = new Date(endIso);
  const now = new Date();
  if (now > end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

function formatReportDate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

function formatIncidentDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function computeDailyAssessment(
  data: OverviewData,
  jtfAssessments: JtfAssessmentInput[] = []
): DailyAssessment {
  const severityLevel = severityFromPriorityAreas(data.priorityAreaCount);
  const incidentTrend = incidentTrendFrom(data.incidentsByDay);
  const remaining = daysRemaining(data.bpe.endDate);
  const voterCoveragePct = safePercent(data.totalDeployed, data.totalRegisteredVoters);

  const totalAreas = data.electionOpsFunnel.find((s) => s.label === "Total Areas")?.count ?? 0;
  const paraphDelivered =
    data.electionOpsFunnel.find((s) => s.label === "Paraphernalia Delivered")?.count ?? 0;
  const acmSealed =
    data.electionOpsFunnel.find((s) => s.label === "ACM Tested & Sealed")?.count ?? 0;
  const paraphPct = safePercent(paraphDelivered, totalAreas);
  const acmPct = safePercent(acmSealed, totalAreas);

  const analysis: string[] = [];
  analysis.push(
    `${data.totalDeployed.toLocaleString()} personnel deployed to polling (${data.totalQrf.toLocaleString()} QRF) BARMM-wide.`
  );
  if (data.totalRegisteredVoters > 0) {
    analysis.push(
      `Deployment covers ${voterCoveragePct?.toFixed(1) ?? "—"}% of ${data.totalRegisteredVoters.toLocaleString()} registered voters on file.`
    );
  }
  analysis.push(
    `${data.recentIncidentCount30d.toLocaleString()} incident(s) reported in the last 30 days; the 14-day trend is ${incidentTrend}.`
  );
  analysis.push(
    `${data.priorityAreaCount.toLocaleString()} area(s) score at or above the Red-hotspot priority threshold.`
  );
  if (totalAreas > 0) {
    analysis.push(
      `Of ${totalAreas.toLocaleString()} BPE-tracked polling area(s), ${paraphPct?.toFixed(0) ?? 0}% have paraphernalia delivered and ${acmPct?.toFixed(0) ?? 0}% have ACM tested and sealed.`
    );
  }
  analysis.push(
    remaining === null
      ? "The BPE 2026 window has concluded."
      : `${remaining} day(s) remain in the BPE 2026 window.`
  );

  // ---- Strategic: BARMM-wide posture and cross-JTF resource allocation ----
  const strategic: string[] = [];

  if (severityLevel === "CRITICAL" || severityLevel === "ELEVATED") {
    strategic.push(
      `Sustain a heightened BARMM-wide security posture through the remainder of the BPE 2026 window — ${data.priorityAreaCount.toLocaleString()} area(s) are at or above the Red-hotspot priority threshold. Consider requesting augmentation forces from higher headquarters if this count continues to climb.`
    );
  } else {
    strategic.push(
      `Current BARMM-wide priority-area count (${data.priorityAreaCount.toLocaleString()}) does not warrant additional force augmentation beyond standing allocations — maintain present command-wide posture.`
    );
  }

  // Cross-reference the top priority areas' province against per-JTF
  // deployment totals to flag a JTF that is carrying high-priority ground
  // without a commensurate share of deployed strength.
  const deploymentByJtf = new Map(data.jtfDeployments.map((d) => [d.jtfName, d]));
  const totalDeployedAll = data.totalDeployed || 1;
  const jtfPriorityHits = new Map<string, number>();
  for (const area of data.topPriorityAreas) {
    const jtfName = PROVINCE_TO_JTF[area.province];
    if (jtfName) jtfPriorityHits.set(jtfName, (jtfPriorityHits.get(jtfName) ?? 0) + 1);
  }
  for (const [jtfName, hits] of jtfPriorityHits) {
    const deployment = deploymentByJtf.get(jtfName);
    if (!deployment) continue;
    const deployedSharePct = (deployment.deployedToPolling / totalDeployedAll) * 100;
    if (hits >= 2 && deployedSharePct < 20) {
      strategic.push(
        `${jtfName} holds ${hits} of the top ${data.topPriorityAreas.length} BARMM-wide priority areas but only ${deployedSharePct.toFixed(0)}% of total deployed strength — consider reallocating troops/QRF from lower-priority JTFs to rebalance command-wide risk.`
      );
    }
  }

  if (
    remaining !== null &&
    remaining <= 14 &&
    voterCoveragePct !== null &&
    voterCoveragePct < 50
  ) {
    strategic.push(
      `Voter coverage stands at only ${voterCoveragePct.toFixed(0)}% BARMM-wide with ${remaining} day(s) remaining in the BPE window — direct a command-wide acceleration of troop deployment to polling areas rather than a JTF-by-JTF response.`
    );
  }

  // ---- Operational: JTF/provincial coordination and BPE logistics ----
  const operational: string[] = [];

  if (incidentTrend === "increasing") {
    operational.push(
      "The 14-day incident trend is increasing — direct affected JTFs to increase inter-unit intelligence sharing, joint patrol scheduling, and community liaison engagement in the areas generating the uptick."
    );
  } else if (incidentTrend === "decreasing") {
    operational.push(
      "The 14-day incident trend is decreasing — maintain current joint patrol tempo across JTFs; do not draw down coordination measures until the trend holds for a full reporting cycle."
    );
  }

  if (totalAreas > 0 && remaining !== null && remaining <= 14) {
    if (paraphPct !== null && paraphPct < 80) {
      operational.push(
        `Only ${paraphPct.toFixed(0)}% of tracked areas have paraphernalia delivered with ${remaining} day(s) remaining — coordinate with COMELEC/BEO field offices to expedite delivery on the outstanding areas.`
      );
    }
    if (acmPct !== null && acmPct < 80) {
      operational.push(
        `Only ${acmPct.toFixed(0)}% of tracked areas have ACM tested and sealed with ${remaining} day(s) remaining — schedule joint testing/sealing teams to clear the backlog ahead of polling.`
      );
    }
  }

  // Per-JTF operational note: a JTF whose incident share (from monitored
  // incidents on file) outweighs its deployment share.
  const incidentCountByJtf = new Map<string, number>();
  for (const incident of data.recentIncidents) {
    incidentCountByJtf.set(incident.jtfName, (incidentCountByJtf.get(incident.jtfName) ?? 0) + 1);
  }
  const totalRecentIncidents = data.recentIncidents.length || 1;
  for (const [jtfName, count] of incidentCountByJtf) {
    const deployment = deploymentByJtf.get(jtfName);
    if (!deployment) continue;
    const incidentSharePct = (count / totalRecentIncidents) * 100;
    const deployedSharePct = (deployment.deployedToPolling / totalDeployedAll) * 100;
    if (incidentSharePct >= 40 && incidentSharePct - deployedSharePct >= 15) {
      operational.push(
        `${jtfName} accounts for ${count} of the ${data.recentIncidents.length} most recently monitored incidents (${incidentSharePct.toFixed(0)}%) against ${deployedSharePct.toFixed(0)}% of deployed strength — redistribute QRF assets from adjacent JTFs to restore proportional coverage.`
      );
    }
  }

  // ---- Tactical: specific areas and incident types ----
  const tactical: string[] = [];

  if (data.topPriorityAreas.length > 0) {
    const top3 = data.topPriorityAreas
      .slice(0, 3)
      .map((a) => a.label)
      .join("; ");
    tactical.push(
      `Position or reinforce troop/QRF presence at the highest-scoring priority areas: ${top3}.`
    );
  }

  const violentIncidents = data.recentIncidents.filter((i) => isViolentIncidentType(i.type));
  if (violentIncidents.length > 0) {
    const named = violentIncidents
      .slice(0, 3)
      .map(
        (i) =>
          `${i.type} in ${i.areaLabel ?? i.jtfName} on ${formatIncidentDate(i.date)}`
      )
      .join("; ");
    tactical.push(
      `Review convoy security and vary patrol routes at the site(s) of recent armed incidents — ${named}.`
    );
  }
  if (violentIncidents.length >= 2) {
    tactical.push(
      `${violentIncidents.length} armed/violent-type incident(s) appear among the most recently monitored — recommend checkpoint reinforcement and short-interval security reviews at the affected areas until the pattern breaks.`
    );
  }

  const priorityIncidents = data.recentIncidents.filter((i) => i.isPriority);
  if (priorityIncidents.length > 0) {
    const named = priorityIncidents
      .slice(0, 3)
      .map((i) => i.areaLabel ?? i.jtfName)
      .join("; ");
    tactical.push(
      `Flag the following areas for immediate follow-up patrol given a recent incident at an already priority-scored location: ${named}.`
    );
  }

  if (operational.length === 0) {
    operational.push(
      "No operational-level gaps detected against current thresholds — maintain routine JTF coordination and BPE logistics tracking."
    );
  }
  if (tactical.length === 0) {
    tactical.push(
      "No tactical-level triggers from monitored incidents at this time — continue routine patrol and reporting."
    );
  }

  return {
    reportDate: formatReportDate(),
    generatedAt: new Date().toISOString(),
    severityLevel,
    incidentTrend,
    analysis,
    // Quoted verbatim, never rewritten or summarized — see the module
    // comment on why this app never fabricates/paraphrases a figure or a
    // JTF's own words.
    jtfAssessments,
    recommendations: { strategic, operational, tactical },
  };
}

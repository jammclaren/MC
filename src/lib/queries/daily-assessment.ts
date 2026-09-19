import { safePercent } from "@/lib/percentages";
import { isViolentIncidentType } from "@/lib/incident-classification";
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

// 30-day incident count thresholds for the overall severity call — plain,
// editable constants, not a model. An increasing trend bumps the level up
// one step (capped at CRITICAL): a rising trajectory is itself reason to
// caution the level up, not just the raw count.
const CRITICAL_INCIDENT_THRESHOLD = 30;
const ELEVATED_INCIDENT_THRESHOLD = 15;
const MODERATE_INCIDENT_THRESHOLD = 5;
const SEVERITY_ORDER: SeverityLevel[] = ["LOW", "MODERATE", "ELEVATED", "CRITICAL"];

function severityFromIncidents(
  recentIncidentCount30d: number,
  trend: "increasing" | "decreasing" | "stable"
): SeverityLevel {
  let level: SeverityLevel;
  if (recentIncidentCount30d >= CRITICAL_INCIDENT_THRESHOLD) level = "CRITICAL";
  else if (recentIncidentCount30d >= ELEVATED_INCIDENT_THRESHOLD) level = "ELEVATED";
  else if (recentIncidentCount30d >= MODERATE_INCIDENT_THRESHOLD) level = "MODERATE";
  else level = "LOW";

  if (trend === "increasing") {
    const idx = SEVERITY_ORDER.indexOf(level);
    level = SEVERITY_ORDER[Math.min(idx + 1, SEVERITY_ORDER.length - 1)];
  }
  return level;
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
  const incidentTrend = incidentTrendFrom(data.incidentsByDay);
  const severityLevel = severityFromIncidents(data.recentIncidentCount30d, incidentTrend);
  const remaining = daysRemaining(data.bpe.endDate);
  const voterCoveragePct = safePercent(data.totalStrength, data.totalRegisteredVoters);

  const analysis: string[] = [];
  analysis.push(
    `${data.totalStrength.toLocaleString()} personnel strength on file BARMM-wide (${data.totalCriticalAssets.toLocaleString()} critical asset(s), ${data.totalCheckpointOps.toLocaleString()} checkpoint operation(s)).`
  );
  if (data.totalRegisteredVoters > 0) {
    analysis.push(
      `Personnel strength covers ${voterCoveragePct?.toFixed(1) ?? "—"}% of ${data.totalRegisteredVoters.toLocaleString()} registered voters on file.`
    );
  }
  analysis.push(
    `${data.recentIncidentCount30d.toLocaleString()} incident(s) reported in the last 30 days; the 14-day trend is ${incidentTrend}.`
  );
  analysis.push(
    remaining === null
      ? "The BPE 2026 window has concluded."
      : `${remaining} day(s) remain in the BPE 2026 window.`
  );

  // ---- Strategic: BARMM-wide posture and cross-JTF resource allocation ----
  const strategic: string[] = [];

  if (severityLevel === "CRITICAL" || severityLevel === "ELEVATED") {
    strategic.push(
      `Sustain a heightened BARMM-wide security posture through the remainder of the BPE 2026 window — ${data.recentIncidentCount30d.toLocaleString()} incident(s) in the last 30 days with ${incidentTrend === "increasing" ? "an" : "a"} ${incidentTrend} trend. Consider requesting augmentation forces from higher headquarters if this trend continues.`
    );
  } else {
    strategic.push(
      `Current BARMM-wide incident volume (${data.recentIncidentCount30d.toLocaleString()} in the last 30 days, ${incidentTrend} trend) does not warrant additional force augmentation beyond standing allocations — maintain present command-wide posture.`
    );
  }

  const sitRepByJtf = new Map(data.jtfSitReps.map((d) => [d.jtfName, d]));
  const totalStrengthAll = data.totalStrength || 1;

  if (
    remaining !== null &&
    remaining <= 14 &&
    voterCoveragePct !== null &&
    voterCoveragePct < 50
  ) {
    strategic.push(
      `Voter coverage stands at only ${voterCoveragePct.toFixed(0)}% BARMM-wide with ${remaining} day(s) remaining in the BPE window — direct a command-wide reinforcement of personnel strength rather than a JTF-by-JTF response.`
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

  // Per-JTF operational note: a JTF whose incident share (from monitored
  // incidents on file) outweighs its deployment share.
  const incidentCountByJtf = new Map<string, number>();
  for (const incident of data.recentIncidents) {
    incidentCountByJtf.set(incident.jtfName, (incidentCountByJtf.get(incident.jtfName) ?? 0) + 1);
  }
  const totalRecentIncidents = data.recentIncidents.length || 1;
  for (const [jtfName, count] of incidentCountByJtf) {
    const sitRep = sitRepByJtf.get(jtfName);
    if (!sitRep) continue;
    const incidentSharePct = (count / totalRecentIncidents) * 100;
    const strengthSharePct = (sitRep.totalStrength / totalStrengthAll) * 100;
    if (incidentSharePct >= 40 && incidentSharePct - strengthSharePct >= 15) {
      operational.push(
        `${jtfName} accounts for ${count} of the ${data.recentIncidents.length} most recently monitored incidents (${incidentSharePct.toFixed(0)}%) against ${strengthSharePct.toFixed(0)}% of total strength — redistribute units from adjacent JTFs to restore proportional coverage.`
      );
    }
  }

  // ---- Tactical: specific areas and incident types ----
  const tactical: string[] = [];

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

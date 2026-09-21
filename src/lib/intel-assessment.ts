// Deterministic "Overall Analysis & Assessment" for the Intelligence Update
// page — same no-fabrication stance as daily-assessment.ts: every line is a
// count, a threshold, or a verbatim-quoted field, never an NLP summary of
// `narrative` free text.
import type { IntelUpdateRow } from "@/lib/queries/intel-updates";

const TREND_WINDOW_DAYS = 14;

export interface IntelAssessment {
  analysis: string[];
}

function trendFrom(rows: IntelUpdateRow[]): "increasing" | "decreasing" | "stable" {
  const now = Date.now();
  const halfMs = (TREND_WINDOW_DAYS / 2) * 24 * 60 * 60 * 1000;
  const windowMs = TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  let priorHalf = 0;
  let recentHalf = 0;
  for (const row of rows) {
    const age = now - new Date(row.date).getTime();
    if (age < 0 || age > windowMs) continue;
    if (age <= halfMs) recentHalf += 1;
    else priorHalf += 1;
  }
  if (recentHalf > priorHalf) return "increasing";
  if (recentHalf < priorHalf) return "decreasing";
  return "stable";
}

// Blank/null values are excluded rather than bucketed into an
// "Unspecified" entry — a report with no threat group on file shouldn't
// be able to win the #1 "most-cited threat group" slot just because
// "blank" happens to be the single most common value. Same rule the BY
// THREAT GROUP / BY POLITICAL PARTY charts already follow.
function topByFrequency(values: (string | null)[], limit: number): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const label = v?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function computeIntelAssessment(rows: IntelUpdateRow[]): IntelAssessment {
  const analysis: string[] = [];
  const violent = rows.filter((r) => r.category === "VIOLENT");
  const nonViolent = rows.filter((r) => r.category === "NON_VIOLENT");

  analysis.push(
    `${rows.length.toLocaleString()} report(s) on file — ${violent.length.toLocaleString()} violent, ${nonViolent.length.toLocaleString()} non-violent.`
  );

  const trend = trendFrom(rows);
  analysis.push(`${TREND_WINDOW_DAYS}-day reporting trend is ${trend}.`);

  const topActivityTypes = topByFrequency(
    rows.map((r) => r.activityType),
    3
  );
  if (topActivityTypes.length > 0) {
    analysis.push(
      `Most-cited activity type(s): ${topActivityTypes.map((t) => `${t.label} (${t.count})`).join(", ")}.`
    );
  }

  const topThreatGroups = topByFrequency(
    rows.map((r) => r.threatGroup),
    3
  );
  if (topThreatGroups.length > 0) {
    analysis.push(
      `Most-cited threat group(s): ${topThreatGroups.map((g) => `${g.label} (${g.count})`).join(", ")}.`
    );
  }

  const topProvinces = topByFrequency(
    rows.map((r) => r.province),
    3
  );
  if (topProvinces.length > 0) {
    analysis.push(
      `Most-reported province(s): ${topProvinces.map((p) => `${p.label} (${p.count})`).join(", ")}.`
    );
  }

  // Same severity-first pick as the Intel Activity Map's "Most Significant
  // Activity" box (see intel-update/page.tsx) — violent outranks
  // non-violent regardless of recency, falling back to the latest
  // non-violent report only when no violent activity is on file at all.
  const mostSignificant = violent[0] ?? nonViolent[0];
  if (mostSignificant) {
    const label = mostSignificant.activityType ?? mostSignificant.narrative;
    const severity = mostSignificant.category === "VIOLENT" ? "violent" : "non-violent";
    analysis.push(
      `Most significant activity: ${label} (${severity}) in ${mostSignificant.province} on ${new Date(mostSignificant.date).toLocaleDateString()}.`
    );
  } else {
    analysis.push("No activity on file.");
  }

  return { analysis };
}

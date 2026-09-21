// Deterministic assessment for the CMO Workspace — same no-fabrication
// stance as intel-assessment.ts: every line is a count, a threshold, or a
// verbatim-quoted field, never an NLP summary of `narrative` free text.
import type { CmoActivityRow, CmoActivityCategory } from "@/lib/queries/cmo-activities";

const TREND_WINDOW_DAYS = 14;

export interface CmoActivityAssessment {
  analysis: string[];
}

export const CMO_CATEGORY_LABELS: Record<CmoActivityCategory, string> = {
  PUBLIC_AFFAIRS: "Public Affairs",
  CIVIL_AFFAIRS: "Civil Affairs",
  PSYOPS: "PsyOps",
  IEC: "Information Education Campaign",
};

const CATEGORY_ORDER: CmoActivityCategory[] = ["PUBLIC_AFFAIRS", "CIVIL_AFFAIRS", "PSYOPS", "IEC"];

function trendFrom(rows: CmoActivityRow[]): "increasing" | "decreasing" | "stable" {
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

export function computeCmoActivityAssessment(rows: CmoActivityRow[]): CmoActivityAssessment {
  const analysis: string[] = [];

  analysis.push(`${rows.length.toLocaleString()} CMO activity(ies) on file.`);

  if (rows.length === 0) {
    return { analysis };
  }

  const trend = trendFrom(rows);
  analysis.push(`${TREND_WINDOW_DAYS}-day reporting trend is ${trend}.`);

  const counts = new Map<CmoActivityCategory, number>();
  for (const row of rows) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }
  const breakdown = CATEGORY_ORDER.map(
    (cat) => `${CMO_CATEGORY_LABELS[cat]} (${counts.get(cat) ?? 0})`
  ).join(", ");
  analysis.push(`Category breakdown: ${breakdown}.`);

  const mostActive = CATEGORY_ORDER.reduce((best, cat) =>
    (counts.get(cat) ?? 0) > (counts.get(best) ?? 0) ? cat : best
  );
  const mostActiveCount = counts.get(mostActive) ?? 0;
  if (mostActiveCount > 0) {
    analysis.push(`Most active category: ${CMO_CATEGORY_LABELS[mostActive]} (${mostActiveCount}).`);
  }

  return { analysis };
}

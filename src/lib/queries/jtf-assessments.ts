import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";

export interface JtfAssessmentRow {
  id: string;
  jtfId: string;
  jtfName: string;
  authorName: string;
  summary: string;
  createdAt: string;
}

// A JTF-scoped user only ever reads their own JTF's entries here (their own
// submissions); COMMAND/WFC_STAFF/ADMIN (jtfId === null) read every JTF's —
// scopeJtfFilter's base behavior already gives exactly this without
// allowRollup, since JTF_COMMANDER's "other JTFs rollup-only" exception
// (see rbac.ts canReadRollup) doesn't apply to this narrative content, only
// to aggregate figures.
export async function listJtfAssessments(user: SessionUser): Promise<JtfAssessmentRow[]> {
  const scopeJtfId = scopeJtfFilter(user);
  const rows = await prisma.jtfAssessment.findMany({
    where: { jtfId: scopeJtfId },
    include: { jtf: { select: { name: true } }, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    jtfId: r.jtfId,
    jtfName: r.jtf.name,
    authorName: r.author.name,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  }));
}

const RECENT_WINDOW_DAYS = 7;

/** Most recent assessment per JTF, within the last week — feeds the Daily
 * Analysis panel as a source alongside its stats-derived analysis. Always
 * command-wide (no jtfId scoping): the Daily Analysis panel itself is
 * already a command-wide rollup view. */
export async function listRecentJtfAssessmentsForDailyAnalysis(): Promise<JtfAssessmentRow[]> {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.jtfAssessment.findMany({
    where: { createdAt: { gte: since } },
    include: { jtf: { select: { name: true } }, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const latestByJtf = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!latestByJtf.has(r.jtfId)) latestByJtf.set(r.jtfId, r);
  }
  return Array.from(latestByJtf.values()).map((r) => ({
    id: r.id,
    jtfId: r.jtfId,
    jtfName: r.jtf.name,
    authorName: r.author.name,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  }));
}

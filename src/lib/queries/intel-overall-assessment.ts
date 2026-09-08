import { prisma } from "@/lib/prisma";
import { assertCanAccessIntelligenceUpdate, type SessionUser } from "@/lib/rbac";

export interface IntelOverallAssessmentRow {
  id: string;
  summary: string;
  authorName: string;
  createdAt: string;
  /** Set once the daily 1700H purge stamps it — null means "still active,
   * shown by default"; a stamped row only shows under the History toggle. */
  purgedAt: string | null;
}

export async function listIntelOverallAssessments(
  user: SessionUser
): Promise<IntelOverallAssessmentRow[]> {
  assertCanAccessIntelligenceUpdate(user);
  const rows = await prisma.intelOverallAssessment.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    summary: r.summary,
    authorName: r.author.name,
    createdAt: r.createdAt.toISOString(),
    purgedAt: r.purgedAt?.toISOString() ?? null,
  }));
}

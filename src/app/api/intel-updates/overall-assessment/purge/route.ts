import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

/**
 * Daily 1700H (Asia/Manila) reset of WFC-Intelligence's manually-entered
 * Overall Assessment — same cadence/reasoning as
 * api/jtf-assessments/purge (see vercel.json's "0 9 * * *" entry there
 * and here). Unlike that one, this is a soft delete (purgedAt stamped,
 * row kept) so the page's "History" toggle has something to show — see
 * the IntelOverallAssessment schema comment. Vercel Cron sends a GET
 * carrying `Authorization: Bearer $CRON_SECRET`; an ADMIN may also
 * trigger it manually, never anyone else — a blanket purge is too
 * disruptive to leave open to the same write access (ADMIN +
 * WFC-Intelligence) that can create these.
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }
  const user = await getSessionUser();
  return user?.role === "ADMIN";
}

async function purge() {
  // AuditLog.userId is a required FK — there's no real acting user for a
  // scheduled job, so this attributes the entry to the earliest ADMIN
  // account on file, same convention as api/jtf-assessments/purge.
  const systemUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!systemUser) {
    const error = new Error("No ADMIN account on file to attribute the purge to");
    (error as { status?: number }).status = 500;
    throw error;
  }

  const existing = await prisma.intelOverallAssessment.findMany({
    where: { purgedAt: null },
    select: { id: true, authorId: true },
  });

  const result = await withAudit(
    (tx) =>
      tx.intelOverallAssessment.updateMany({
        where: { purgedAt: null },
        data: { purgedAt: new Date() },
      }),
    {
      userId: systemUser.id,
      action: "UPDATE",
      entity: "IntelOverallAssessment",
      entityId: "daily-1700h-purge",
      diff: { purgedCount: existing.length, purgedIds: existing.map((e) => e.id) },
    }
  );

  return result.count;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const deletedCount = await purge();
    return NextResponse.json({ deletedCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

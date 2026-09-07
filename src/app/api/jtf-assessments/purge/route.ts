import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

/**
 * Daily 1700H (Asia/Manila) reset of the JTF Overall Assessment board — see
 * vercel.json's cron entry ("0 9 * * *" = 09:00 UTC = 17:00 PHT). Vercel
 * Cron sends a GET request carrying `Authorization: Bearer $CRON_SECRET`;
 * an ADMIN may also trigger it manually (e.g. to test), never anyone else —
 * a blanket delete across every JTF is too destructive to leave open to a
 * bare session check like the social-posts sync route.
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
  // account on file (a stand-in "system operator of record") rather than
  // skipping the audit trail SPEC.md §7 requires for every mutating write.
  const systemUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!systemUser) {
    const error = new Error("No ADMIN account on file to attribute the purge to");
    (error as { status?: number }).status = 500;
    throw error;
  }

  const existing = await prisma.jtfAssessment.findMany({
    select: { id: true, jtfId: true, authorId: true },
  });

  const result = await withAudit((tx) => tx.jtfAssessment.deleteMany({}), {
    userId: systemUser.id,
    action: "DELETE",
    entity: "JtfAssessment",
    entityId: "daily-1700h-purge",
    diff: { deletedCount: existing.length, deletedIds: existing.map((e) => e.id) },
  });

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

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteIntelligenceUpdate } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";

const createSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    assertCanWriteIntelligenceUpdate(user);
    const body = createSchema.parse(await request.json());

    // Only the latest submission is ever "active" — a new one immediately
    // retires whatever was active into history (purgedAt stamped) rather
    // than stacking up until the 1700H cron purge runs.
    const created = await prisma.$transaction(async (tx) => {
      const retired = await tx.intelOverallAssessment.findMany({
        where: { purgedAt: null },
        select: { id: true },
      });
      if (retired.length > 0) {
        await tx.intelOverallAssessment.updateMany({
          where: { purgedAt: null },
          data: { purgedAt: new Date() },
        });
      }
      const row = await tx.intelOverallAssessment.create({
        data: { authorId: user.id, summary: body.summary },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entity: "IntelOverallAssessment",
          entityId: row.id,
          diff: { ...body, retiredToHistoryIds: retired.map((r) => r.id) },
        },
      });
      return row;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

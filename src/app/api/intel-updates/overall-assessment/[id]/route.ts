import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteIntelligenceUpdate } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    assertCanWriteIntelligenceUpdate(user);

    const existing = await prisma.intelOverallAssessment.findUnique({ where: { id } });
    if (!existing) {
      const error = new Error("Not found");
      (error as { status?: number }).status = 404;
      throw error;
    }
    // Only today's still-active entry is editable — once the 1700H purge
    // stamps purgedAt, it's history and stays as originally submitted.
    if (existing.purgedAt) {
      const error = new Error("This assessment has already been cleared and can no longer be edited");
      (error as { status?: number }).status = 400;
      throw error;
    }

    const body = updateSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.intelOverallAssessment.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "IntelOverallAssessment",
        entityId: id,
        diff: { before: existing.summary, after: body.summary },
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

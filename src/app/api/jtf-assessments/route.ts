import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { listJtfAssessments } from "@/lib/queries/jtf-assessments";

const createAssessmentSchema = z.object({
  jtfId: z.string().min(1).optional(),
  summary: z.string().trim().min(1).max(4000),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    const rows = await listJtfAssessments(user);
    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = createAssessmentSchema.parse(await request.json());
    const jtfId = body.jtfId ?? user.jtfId;
    if (!jtfId) {
      const error = new Error("No JTF on this account to submit an assessment for");
      (error as { status?: number }).status = 400;
      throw error;
    }
    assertCanWriteJtf(user, jtfId);

    const created = await withAudit(
      (tx) =>
        tx.jtfAssessment.create({
          data: { jtfId, authorId: user.id, summary: body.summary },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "JtfAssessment",
        entityId: (result) => result.id,
        diff: { jtfId, summary: body.summary },
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

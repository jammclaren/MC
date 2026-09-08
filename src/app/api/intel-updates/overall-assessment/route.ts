import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteIntelligenceUpdate } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    assertCanWriteIntelligenceUpdate(user);
    const body = createSchema.parse(await request.json());

    const created = await withAudit(
      (tx) =>
        tx.intelOverallAssessment.create({
          data: { authorId: user.id, summary: body.summary },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "IntelOverallAssessment",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

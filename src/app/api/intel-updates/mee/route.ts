import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteIntelligenceUpdate } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createSchema = z.object({
  // Absent/null jtfId means TOW-WESTMIN (WESMINCOM's own equipment, not a
  // subordinate JTF's) — see IntelMeeAsset schema comment.
  jtfId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  assetType: z.string().trim().min(1).max(120),
  quantity: z.number().int().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanWriteIntelligenceUpdate(user);
    const body = createSchema.parse(await request.json());

    const created = await withAudit(
      (tx) => tx.intelMeeAsset.create({ data: { ...body, createdById: user.id } }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "IntelMeeAsset",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const patchSchema = z.object({
  action: z.enum(["approve", "kick"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN"]);

    const { action } = patchSchema.parse(await request.json());
    const status = action === "approve" ? "APPROVED" : "KICKED";

    const existing = await prisma.userDevice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await withAudit(
      (tx) => tx.userDevice.update({ where: { id }, data: { status } }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "UserDevice",
        entityId: id,
        diff: { action, previousStatus: existing.status, deviceLabel: existing.deviceLabel },
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

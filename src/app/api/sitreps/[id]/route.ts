import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteDeployment, ForbiddenError } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

async function loadSitRepOrThrow(id: string) {
  const sitRep = await prisma.sitRep.findUnique({ where: { id } });
  if (!sitRep) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return sitRep;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    if (user.role === "BRIGADE_STAFF") {
      throw new ForbiddenError("Not authorized to write SITREP data");
    }
    const existing = await loadSitRepOrThrow(id);
    assertCanWriteDeployment(user, existing.jtfId);

    await withAudit(
      (tx) => tx.sitRep.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "SitRep",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

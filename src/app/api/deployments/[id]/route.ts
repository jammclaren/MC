import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteDeployment, ForbiddenError } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateDeploymentSchema = z.object({
  jtfId: z.string().min(1).optional(),
  electionAreaId: z.string().nullable().optional(),
  battalion: z.string().trim().max(120).nullable().optional(),
  brigade: z.string().trim().max(120).nullable().optional(),
  deployedToPolling: z.number().int().nonnegative().optional(),
  deployedToPollingCenters: z.number().int().nonnegative().optional(),
  qrf: z.number().int().nonnegative().optional(),
  afpOfficers: z.number().int().nonnegative().optional(),
  afpEnlisted: z.number().int().nonnegative().optional(),
  caa: z.number().int().nonnegative().optional(),
  wavsTav: z.number().int().nonnegative().optional(),
  pnpOfficers: z.number().int().nonnegative().optional(),
  pnpEnlisted: z.number().int().nonnegative().optional(),
  pcg: z.number().int().nonnegative().optional(),
  checkpointOps: z.number().int().nonnegative().optional(),
  airAssetType: z.string().trim().max(120).nullable().optional(),
  airAssetCount: z.number().int().nonnegative().optional(),
  navalAssetType: z.string().trim().max(120).nullable().optional(),
  navalAssetCount: z.number().int().nonnegative().optional(),
  isrAssetType: z.string().trim().max(120).nullable().optional(),
  isrAssetCount: z.number().int().nonnegative().optional(),
});

async function loadDeploymentOrThrow(id: string) {
  const deployment = await prisma.troopDeployment.findUnique({ where: { id } });
  if (!deployment) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return deployment;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    if (user.role === "BRIGADE_STAFF") {
      throw new ForbiddenError("Not authorized to write deployment data");
    }
    const existing = await loadDeploymentOrThrow(id);
    assertCanWriteDeployment(user, existing.jtfId);

    const body = updateDeploymentSchema.parse(await request.json());
    // Reassigning a battalion to a different JTF requires write access to
    // that JTF too, not just the one it's currently under.
    if (body.jtfId && body.jtfId !== existing.jtfId) {
      assertCanWriteDeployment(user, body.jtfId);
    }

    const updated = await withAudit(
      (tx) => tx.troopDeployment.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "TroopDeployment",
        entityId: id,
        diff: { before: existing, changes: body },
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    if (user.role === "BRIGADE_STAFF") {
      throw new ForbiddenError("Not authorized to write deployment data");
    }
    const existing = await loadDeploymentOrThrow(id);
    assertCanWriteDeployment(user, existing.jtfId);

    await withAudit(
      (tx) => tx.troopDeployment.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "TroopDeployment",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

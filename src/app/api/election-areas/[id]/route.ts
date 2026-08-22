import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateAreaSchema = z.object({
  unitId: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  province: z.string().min(1).optional(),
  city: z.string().nullable().optional(),
  municipality: z.string().nullable().optional(),
  barangay: z.string().nullable().optional(),
  hotspotCategory: z.string().nullable().optional(),
  hotspotReason: z.string().nullable().optional(),
  numPrecincts: z.number().int().nonnegative().nullable().optional(),
  numCenters: z.number().int().nonnegative().nullable().optional(),
  registeredVoters: z.number().int().nonnegative().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

async function loadAreaOrThrow(id: string) {
  const area = await prisma.electionArea.findUnique({ where: { id } });
  if (!area) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return area;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const existing = await loadAreaOrThrow(id);
    assertCanWriteJtf(user, existing.jtfId);

    const body = updateAreaSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.electionArea.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "ElectionArea",
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
    const existing = await loadAreaOrThrow(id);
    assertCanWriteJtf(user, existing.jtfId);

    await withAudit(
      (tx) => tx.electionArea.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "ElectionArea",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

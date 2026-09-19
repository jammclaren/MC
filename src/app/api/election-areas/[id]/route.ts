import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const pollingCenterSchema = z.object({
  name: z.string().trim().min(1),
  numPrecincts: z.number().int().nonnegative().nullable().optional(),
});

const updateAreaSchema = z.object({
  unitId: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  province: z.string().min(1).optional(),
  city: z.string().nullable().optional(),
  municipality: z.string().nullable().optional(),
  barangay: z.string().nullable().optional(),
  numPrecincts: z.number().int().nonnegative().nullable().optional(),
  numCenters: z.number().int().nonnegative().nullable().optional(),
  // Sent as the full current list — replaces whatever was on file, same
  // "form owns the whole state" contract the rest of this route already
  // uses for scalar fields.
  pollingCenters: z.array(pollingCenterSchema).optional(),
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
    const { pollingCenters, ...areaData } = body;

    const updated = await withAudit(
      async (tx) => {
        if (pollingCenters !== undefined) {
          await tx.pollingCenter.deleteMany({ where: { electionAreaId: id } });
        }
        return tx.electionArea.update({
          where: { id },
          data: {
            ...areaData,
            pollingCenters:
              pollingCenters && pollingCenters.length > 0
                ? { create: pollingCenters }
                : undefined,
          },
          include: { pollingCenters: true },
        });
      },
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

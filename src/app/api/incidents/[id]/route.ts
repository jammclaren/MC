import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanModifyEntry } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateIncidentSchema = z.object({
  electionAreaId: z.string().nullable().optional(),
  date: z.coerce.date().optional(),
  type: z.string().trim().min(1).max(120).optional(),
  result: z.string().trim().max(4000).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  markerStyle: z.enum(["NONE", "BLINK", "PULSE"]).optional(),
});

async function loadIncidentOrThrow(id: string) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return incident;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const existing = await loadIncidentOrThrow(id);
    assertCanModifyEntry(user, existing.jtfId, existing.createdById);

    const body = updateIncidentSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.incident.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "Incident",
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
    const existing = await loadIncidentOrThrow(id);
    assertCanModifyEntry(user, existing.jtfId, existing.createdById);

    await withAudit(
      (tx) => tx.incident.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "Incident",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

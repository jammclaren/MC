import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanModifyEntry } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateRecordSchema = z.object({
  count: z.number().int().nonnegative().optional(),
  quarter: z.string().min(1).optional(),
  neutralizationType: z
    .enum(["CAPTURED", "KILLED", "APPREHENDED", "SURRENDERED"])
    .nullable()
    .optional(),
  forceStatus: z.enum(["PSR", "NPSR"]).nullable().optional(),
});

async function loadRecordOrThrow(id: string) {
  const record = await prisma.accomplishmentRecord.findUnique({ where: { id } });
  if (!record) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return record;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const existing = await loadRecordOrThrow(id);
    assertCanModifyEntry(user, existing.jtfId ?? "", existing.createdById);

    const body = updateRecordSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.accomplishmentRecord.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "AccomplishmentRecord",
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
    const existing = await loadRecordOrThrow(id);
    assertCanModifyEntry(user, existing.jtfId ?? "", existing.createdById);

    await withAudit(
      (tx) => tx.accomplishmentRecord.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "AccomplishmentRecord",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

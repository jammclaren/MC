import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateRidoSchema = z.object({
  quarter: z.string().min(1).optional(),
  involving: z.enum(["LLEs/PAGs", "MNLF", "MILF"]).optional(),
  count: z.number().int().nonnegative().optional(),
});

async function loadOrThrow(id: string) {
  const settlement = await prisma.ridoSettlement.findUnique({ where: { id } });
  if (!settlement) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return settlement;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const existing = await loadOrThrow(id);
    assertCanWriteJtf(user, existing.jtfId);

    const body = updateRidoSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.ridoSettlement.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "RidoSettlement",
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
    const existing = await loadOrThrow(id);
    assertCanWriteJtf(user, existing.jtfId);

    await withAudit(
      (tx) => tx.ridoSettlement.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "RidoSettlement",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

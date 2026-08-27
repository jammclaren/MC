import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updatePartySchema = z.object({
  abbreviation: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});

async function loadPartyOrThrow(id: string) {
  const party = await prisma.party.findUnique({ where: { id } });
  if (!party) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return party;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN", "JTF_COMMANDER", "JTF_STAFF"]);
    const existing = await loadPartyOrThrow(id);

    const body = updatePartySchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.party.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "Party",
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
    requireRole(user, ["ADMIN", "JTF_COMMANDER", "JTF_STAFF"]);
    const existing = await loadPartyOrThrow(id);

    const candidateCount = await prisma.candidate.count({ where: { partyId: id } });
    if (candidateCount > 0) {
      const error = new Error(
        `Cannot delete — ${candidateCount} candidate(s) are still assigned to this party.`
      );
      (error as { status?: number }).status = 409;
      throw error;
    }

    await withAudit(
      (tx) => tx.party.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "Party",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

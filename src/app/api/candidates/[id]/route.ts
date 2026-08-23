import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateCandidateSchema = z.object({
  district: z.string().nullable().optional(),
  nameOnBallot: z.string().min(1).optional(),
  partyId: z.string().nullable().optional(),
  isCocFiler: z.boolean().optional(),
  votesEncoded: z.number().int().nonnegative().optional(),
  sourceNote: z.string().nullable().optional(),
});

async function loadCandidateOrThrow(id: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return candidate;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const existing = await loadCandidateOrThrow(id);
    assertCanWriteJtf(user, existing.jtfId);

    const body = updateCandidateSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.candidate.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "Candidate",
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
    const existing = await loadCandidateOrThrow(id);
    assertCanWriteJtf(user, existing.jtfId);

    await withAudit(
      (tx) => tx.candidate.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "Candidate",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

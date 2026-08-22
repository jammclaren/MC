import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const updateHviSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  outcome: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  location: z.string().nullable().optional(),
  narrative: z.string().min(1).optional(),
});

async function loadOrThrow(id: string) {
  const entry = await prisma.hviLogEntry.findUnique({ where: { id } });
  if (!entry) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return entry;
}

// HviLogEntry has no per-JTF ownership field (SPEC.md's model — a shared,
// command-wide log), so unlike other entities there's no jtfId to check
// writes against. Editing/deleting is restricted to ADMIN, matching the
// same reasoning already used for POST in ../route.ts.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN"]);
    const existing = await loadOrThrow(id);

    const body = updateHviSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.hviLogEntry.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "HviLogEntry",
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
    requireRole(user, ["ADMIN"]);
    const existing = await loadOrThrow(id);

    await withAudit(
      (tx) => tx.hviLogEntry.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "HviLogEntry",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

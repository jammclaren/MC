import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const roleSchema = z.enum([
  "ADMIN",
  "COMMAND",
  "JTF_COMMANDER",
  "JTF_STAFF",
  "BRIGADE_STAFF",
  "VIEWER",
  "WFC_STAFF",
]);

const warfightingFunctionSchema = z.enum([
  "COMMAND_CONTROL",
  "INTELLIGENCE",
  "FIRES",
  "MANEUVER",
  "PROTECTION",
  "SUSTAINMENT",
  "CMO",
]);

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: roleSchema.optional(),
  jtfId: z.string().nullable().optional(),
  warfightingFunction: warfightingFunctionSchema.nullable().optional(),
  password: z.string().min(8).optional(),
  maxDevices: z.number().int().positive().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN"]);

    const body = updateUserSchema.parse(await request.json());
    const { password, ...rest } = body;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

    const updated = await withAudit(
      (tx) =>
        tx.user.update({
          where: { id },
          data: { ...rest, ...(passwordHash ? { passwordHash } : {}) },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            jtfId: true,
            warfightingFunction: true,
            maxDevices: true,
          },
        }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "User",
        entityId: id,
        diff: { ...rest, passwordChanged: !!password },
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

    if (id === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, jtfId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await withAudit(
      (tx) => tx.user.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "User",
        entityId: id,
        diff: existing,
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

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
  "VIEWER",
]);

const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: roleSchema,
    jtfId: z.string().optional(),
  })
  .refine(
    (data) => data.role === "ADMIN" || data.role === "COMMAND" || !!data.jtfId,
    { message: "jtfId is required for JTF_COMMANDER, JTF_STAFF, and VIEWER roles", path: ["jtfId"] }
  );

export async function GET() {
  try {
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN"]);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jtfId: true,
        jtf: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN"]);

    const body = createUserSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(body.password, 12);

    const created = await withAudit(
      (tx) =>
        tx.user.create({
          data: {
            name: body.name,
            email: body.email,
            passwordHash,
            role: body.role,
            jtfId: body.jtfId,
          },
          select: { id: true, name: true, email: true, role: true, jtfId: true },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "User",
        entityId: (result) => result.id,
        diff: { name: body.name, email: body.email, role: body.role, jtfId: body.jtfId },
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

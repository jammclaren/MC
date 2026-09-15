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

const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: roleSchema,
    jtfId: z.string().optional(),
    warfightingFunction: warfightingFunctionSchema.optional(),
    maxDevices: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) =>
      data.role === "ADMIN" ||
      data.role === "COMMAND" ||
      data.role === "WFC_STAFF" ||
      data.role === "VIEWER" || // VIEWER may be command-wide (no jtfId) or scoped to one
      !!data.jtfId,
    {
      message: "jtfId is required for JTF_COMMANDER, JTF_STAFF, and BRIGADE_STAFF roles",
      path: ["jtfId"],
    }
  )
  .refine((data) => data.role !== "WFC_STAFF" || !!data.warfightingFunction, {
    message: "warfightingFunction is required for WFC_STAFF",
    path: ["warfightingFunction"],
  });

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
        warfightingFunction: true,
        createdAt: true,
        maxDevices: true,
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
            warfightingFunction: body.warfightingFunction,
            maxDevices: body.maxDevices,
          },
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
        action: "CREATE",
        entity: "User",
        entityId: (result) => result.id,
        diff: {
          name: body.name,
          email: body.email,
          role: body.role,
          jtfId: body.jtfId,
          warfightingFunction: body.warfightingFunction,
          maxDevices: body.maxDevices,
        },
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

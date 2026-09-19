import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteDeployment, ForbiddenError, scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const taskGroupUnitSchema = z.object({
  unitName: z.string().trim().min(1).max(120),
  strength: z.number().int().nonnegative(),
});

const taskGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  units: z.array(taskGroupUnitSchema).default([]),
  criticalAssets: z.array(z.string().trim().min(1).max(120)).default([]),
});

const checkpointOpSchema = z.object({
  location: z.string().trim().min(1).max(60),
  unit: z.string().trim().min(1).max(120),
  remarks: z.string().trim().max(500).optional(),
});

const armedEngagementSchema = z.object({
  unitInvolved: z.string().trim().min(1).max(120),
  confrontedThreat: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(60),
  results: z.string().trim().min(1).max(1000),
});

const createSitRepSchema = z.object({
  jtfId: z.string().min(1),
  taskGroups: z.array(taskGroupSchema).default([]),
  checkpointOpsTotal: z.number().int().nonnegative().default(0),
  checkpointBreakdown: z.array(checkpointOpSchema).default([]),
  armedEngagement: armedEngagementSchema.nullable().optional(),
  significantActivities: z.array(z.string().trim().min(1).max(500)).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = request.nextUrl;
    const jtfId = searchParams.get("jtfId");

    if (jtfId) {
      assertCanReadJtf(user, jtfId);
    }

    const scopeJtfId = scopeJtfFilter(user, jtfId);

    const sitReps = await prisma.sitRep.findMany({
      where: { jtfId: scopeJtfId },
      include: {
        jtf: { select: { name: true } },
        createdBy: { select: { name: true } },
        taskGroups: { include: { units: true, criticalAssets: true } },
        checkpointBreakdown: true,
        armedEngagement: true,
        significantActivities: { orderBy: { order: "asc" } },
      },
      orderBy: { reportedAt: "desc" },
    });
    return NextResponse.json(sitReps);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    // SITREP is one of the two pages BRIGADE_STAFF has no access to at all
    // (see rbac.ts canAccessPage) — block the API too, not just the page.
    if (user.role === "BRIGADE_STAFF") {
      throw new ForbiddenError("Not authorized to write SITREP data");
    }
    const body = createSitRepSchema.parse(await request.json());
    assertCanWriteDeployment(user, body.jtfId);

    const sitRep = await withAudit(
      (tx) =>
        tx.sitRep.create({
          data: {
            jtfId: body.jtfId,
            createdById: user.id,
            checkpointOpsTotal: body.checkpointOpsTotal,
            taskGroups: {
              create: body.taskGroups.map((tg) => ({
                name: tg.name,
                units: { create: tg.units },
                criticalAssets: { create: tg.criticalAssets.map((unitName) => ({ unitName })) },
              })),
            },
            checkpointBreakdown: { create: body.checkpointBreakdown },
            armedEngagement: body.armedEngagement ? { create: body.armedEngagement } : undefined,
            significantActivities: {
              create: body.significantActivities.map((text, index) => ({ text, order: index })),
            },
          },
          include: {
            taskGroups: { include: { units: true, criticalAssets: true } },
            checkpointBreakdown: true,
            armedEngagement: true,
            significantActivities: true,
          },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "SitRep",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(sitRep, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

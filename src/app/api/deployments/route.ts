import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteDeployment, ForbiddenError, scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createDeploymentSchema = z.object({
  jtfId: z.string().min(1),
  electionAreaId: z.string().optional(),
  battalion: z.string().trim().max(120).optional(),
  brigade: z.string().trim().max(120).optional(),
  deployedToPolling: z.number().int().nonnegative().default(0),
  deployedToPollingCenters: z.number().int().nonnegative().default(0),
  qrf: z.number().int().nonnegative().default(0),
  afpOfficers: z.number().int().nonnegative().default(0),
  afpEnlisted: z.number().int().nonnegative().default(0),
  caa: z.number().int().nonnegative().default(0),
  wavsTav: z.number().int().nonnegative().default(0),
  pnpOfficers: z.number().int().nonnegative().default(0),
  pnpEnlisted: z.number().int().nonnegative().default(0),
  pcg: z.number().int().nonnegative().default(0),
  checkpointOps: z.number().int().nonnegative().default(0),
  airAssetType: z.string().trim().max(120).optional(),
  airAssetCount: z.number().int().nonnegative().default(0),
  navalAssetType: z.string().trim().max(120).optional(),
  navalAssetCount: z.number().int().nonnegative().default(0),
  isrAssetType: z.string().trim().max(120).optional(),
  isrAssetCount: z.number().int().nonnegative().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = request.nextUrl;
    const jtfId = searchParams.get("jtfId");
    const electionAreaId = searchParams.get("electionAreaId");

    if (jtfId) {
      assertCanReadJtf(user, jtfId);
    }

    const scopeJtfId = scopeJtfFilter(user, jtfId);

    const deployments = await prisma.troopDeployment.findMany({
      where: {
        jtfId: scopeJtfId,
        electionAreaId: electionAreaId ?? undefined,
      },
      include: { electionArea: true },
      orderBy: { reportedAt: "desc" },
    });
    return NextResponse.json(deployments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    // Deployment is one of the two pages BRIGADE_STAFF has no access to
    // at all (see rbac.ts canAccessPage) — block the API too, not just the
    // page/nav link.
    if (user.role === "BRIGADE_STAFF") {
      throw new ForbiddenError("Not authorized to write deployment data");
    }
    const body = createDeploymentSchema.parse(await request.json());
    assertCanWriteDeployment(user, body.jtfId);

    const deployment = await withAudit(
      (tx) => tx.troopDeployment.create({ data: body }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "TroopDeployment",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(deployment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { safePercent } from "@/lib/percentages";

const upsertStatusSchema = z.object({
  paraphTotalTreasurer: z.number().int().nonnegative().nullable().optional(),
  paraphDeliveredTreasurer: z.number().int().nonnegative().nullable().optional(),
  paraphTotalPrecinct: z.number().int().nonnegative().nullable().optional(),
  paraphDeliveredPrecinct: z.number().int().nonnegative().nullable().optional(),
  acmTestedSealed: z.boolean().optional(),
  votingStarted: z.boolean().optional(),
  votingClosed: z.boolean().optional(),
  transmissionStatus: z.string().nullable().optional(),
  municipalCanvassPct: z.number().min(0).max(100).nullable().optional(),
  municipalProclaimed: z.boolean().optional(),
  provincialCanvassPct: z.number().min(0).max(100).nullable().optional(),
  provincialProclaimed: z.boolean().optional(),
});

async function loadAreaOrThrow(electionAreaId: string) {
  const area = await prisma.electionArea.findUnique({ where: { id: electionAreaId } });
  if (!area) {
    const error = new Error("Election area not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return area;
}

function withComputedFields(status: {
  paraphTotalTreasurer: number | null;
  paraphDeliveredTreasurer: number | null;
  paraphTotalPrecinct: number | null;
  paraphDeliveredPrecinct: number | null;
}) {
  return {
    ...status,
    paraphTreasurerPct: safePercent(
      status.paraphDeliveredTreasurer,
      status.paraphTotalTreasurer
    ),
    paraphPrecinctPct: safePercent(
      status.paraphDeliveredPrecinct,
      status.paraphTotalPrecinct
    ),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ electionAreaId: string }> }
) {
  try {
    const { electionAreaId } = await params;
    const user = await requireSessionUser();
    const area = await loadAreaOrThrow(electionAreaId);
    assertCanReadJtf(user, area.jtfId);

    const status = await prisma.electionOpsStatus.findUnique({
      where: { electionAreaId },
    });
    if (!status) {
      return NextResponse.json(null);
    }
    return NextResponse.json(withComputedFields(status));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ electionAreaId: string }> }
) {
  try {
    const { electionAreaId } = await params;
    const user = await requireSessionUser();
    const area = await loadAreaOrThrow(electionAreaId);
    assertCanWriteJtf(user, area.jtfId);

    const body = upsertStatusSchema.parse(await request.json());

    const status = await withAudit(
      (tx) =>
        tx.electionOpsStatus.upsert({
          where: { electionAreaId },
          create: { electionAreaId, ...body },
          update: body,
        }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "ElectionOpsStatus",
        entityId: electionAreaId,
        diff: body,
      }
    );

    return NextResponse.json(withComputedFields(status));
  } catch (error) {
    return handleApiError(error);
  }
}

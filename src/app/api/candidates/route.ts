import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf, scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createCandidateSchema = z.object({
  jtfId: z.string().min(1),
  province: z.string().min(1),
  district: z.string().nullable().optional(),
  nameOnBallot: z.string().min(1),
  partyId: z.string().nullable().optional(),
  isCocFiler: z.boolean().optional(),
  votesEncoded: z.number().int().nonnegative().optional(),
  sourceNote: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const province = request.nextUrl.searchParams.get("province");
    const scopeJtfId = scopeJtfFilter(user, undefined, { allowRollup: true });

    const candidates = await prisma.candidate.findMany({
      where: { jtfId: scopeJtfId, province: province ?? undefined },
      include: { party: true },
      orderBy: [{ province: "asc" }, { nameOnBallot: "asc" }],
    });
    return NextResponse.json(candidates);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = createCandidateSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    const candidate = await withAudit(
      (tx) =>
        tx.candidate.create({
          data: { ...body, createdById: user.id },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "Candidate",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteJtf, scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createIncidentSchema = z.object({
  jtfId: z.string().min(1),
  electionAreaId: z.string().optional(),
  date: z.coerce.date(),
  type: z.string().min(1),
  result: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = request.nextUrl;
    const jtfId = searchParams.get("jtfId");
    const electionAreaId = searchParams.get("electionAreaId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 200) : undefined;

    if (jtfId) {
      assertCanReadJtf(user, jtfId);
    }

    const scopeJtfId = scopeJtfFilter(user, jtfId);

    const incidents = await prisma.incident.findMany({
      where: {
        jtfId: scopeJtfId,
        electionAreaId: electionAreaId ?? undefined,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { jtf: true, electionArea: true },
      orderBy: { date: "desc" },
      take: limit,
    });
    return NextResponse.json(incidents);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = createIncidentSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    const incident = await withAudit(
      (tx) => tx.incident.create({ data: { ...body, createdById: user.id } }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "Incident",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

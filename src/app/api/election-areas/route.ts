import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteJtf, scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createAreaSchema = z.object({
  jtfId: z.string().min(1),
  unitId: z.string().optional(),
  region: z.string().optional(),
  province: z.string().min(1),
  city: z.string().nullable().optional(),
  municipality: z.string().nullable().optional(),
  barangay: z.string().nullable().optional(),
  hotspotCategory: z.string().nullable().optional(),
  hotspotReason: z.string().nullable().optional(),
  numPrecincts: z.number().int().nonnegative().nullable().optional(),
  numCenters: z.number().int().nonnegative().nullable().optional(),
  registeredVoters: z.number().int().nonnegative().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const jtfId = request.nextUrl.searchParams.get("jtfId");
    if (jtfId) {
      assertCanReadJtf(user, jtfId);
    }

    const scopeJtfId = scopeJtfFilter(user, jtfId);

    const areas = await prisma.electionArea.findMany({
      where: { jtfId: scopeJtfId },
      include: { unit: true, opsStatus: true },
      orderBy: [{ province: "asc" }, { municipality: "asc" }, { barangay: "asc" }],
    });
    return NextResponse.json(areas);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = createAreaSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    const area = await withAudit(
      (tx) => tx.electionArea.create({ data: body }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "ElectionArea",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

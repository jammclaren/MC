import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteJtf, scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createRidoSchema = z.object({
  jtfId: z.string().min(1),
  quarter: z.string().min(1),
  involving: z.enum(["LLEs/PAGs", "MNLF", "MILF"]),
  count: z.number().int().nonnegative(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = request.nextUrl;
    const jtfId = searchParams.get("jtfId");
    const quarter = searchParams.get("quarter");

    if (jtfId) {
      assertCanReadJtf(user, jtfId);
    }

    const scopeJtfId = scopeJtfFilter(user, jtfId);

    const settlements = await prisma.ridoSettlement.findMany({
      where: {
        quarter: quarter ?? undefined,
        jtfId: scopeJtfId,
      },
      include: { jtf: true },
      orderBy: { quarter: "asc" },
    });
    return NextResponse.json(settlements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = createRidoSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    const settlement = await withAudit(
      (tx) => tx.ridoSettlement.create({ data: body }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "RidoSettlement",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

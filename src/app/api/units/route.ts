import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteJtf, scopeJtfFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";

const createUnitSchema = z.object({
  jtfId: z.string().min(1),
  name: z.string().min(1),
  brigade: z.string().optional(),
  province: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const jtfId = request.nextUrl.searchParams.get("jtfId");
    if (jtfId) {
      assertCanReadJtf(user, jtfId);
    }

    const scopeJtfId = scopeJtfFilter(user, jtfId);

    const units = await prisma.unit.findMany({
      where: { jtfId: scopeJtfId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(units);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = createUnitSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    const unit = await prisma.unit.create({ data: body });
    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

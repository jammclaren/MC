import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";

const categorySchema = z.enum(["CTG", "LTG", "CBC"]);

const createIndicatorSchema = z.object({
  category: categorySchema,
  name: z.string().min(1),
  subgroup: z.string().optional(),
  targetYE: z.number().int().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser();
    const category = request.nextUrl.searchParams.get("category");
    const parsedCategory = category ? categorySchema.parse(category) : undefined;

    const indicators = await prisma.indicator.findMany({
      where: parsedCategory ? { category: parsedCategory } : undefined,
      orderBy: [{ category: "asc" }, { subgroup: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(indicators);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN"]);
    const body = createIndicatorSchema.parse(await request.json());

    const indicator = await prisma.indicator.create({ data: body });
    return NextResponse.json(indicator, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

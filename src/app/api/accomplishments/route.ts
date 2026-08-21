import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanReadJtf, assertCanWriteJtf, scopeJtfFilter, ForbiddenError } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createRecordSchema = z.object({
  indicatorId: z.string().min(1),
  jtfId: z.string().min(1).nullable().optional(),
  quarter: z.string().min(1),
  neutralizationType: z
    .enum(["CAPTURED", "KILLED", "APPREHENDED", "SURRENDERED"])
    .optional(),
  forceStatus: z.enum(["PSR", "NPSR"]).optional(),
  count: z.number().int().nonnegative(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = request.nextUrl;
    const jtfId = searchParams.get("jtfId");
    const quarter = searchParams.get("quarter");
    const category = searchParams.get("category");

    if (jtfId) {
      assertCanReadJtf(user, jtfId);
    }

    const scopeJtfId = scopeJtfFilter(user, jtfId);

    const records = await prisma.accomplishmentRecord.findMany({
      where: {
        quarter: quarter ?? undefined,
        jtfId: scopeJtfId,
        indicator: category ? { category: category as never } : undefined,
      },
      include: { indicator: true },
      orderBy: [{ quarter: "asc" }],
    });
    return NextResponse.json(records);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = createRecordSchema.parse(await request.json());

    if (body.jtfId) {
      assertCanWriteJtf(user, body.jtfId);
    } else if (user.role !== "ADMIN") {
      // Command-wide records (jtfId null) may only be entered by ADMIN.
      throw new ForbiddenError(
        "Only ADMIN may create command-wide (non-JTF-scoped) records"
      );
    }

    const record = await withAudit(
      (tx) =>
        tx.accomplishmentRecord.create({
          data: { ...body, createdById: user.id },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "AccomplishmentRecord",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

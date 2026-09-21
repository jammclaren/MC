import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteCmoActivity } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { getSipsDeclarationCount, SIPS_DECLARATION_COUNT_ID } from "@/lib/queries/sips-declaration-count";

const setCountSchema = z.object({
  municipalCount: z.number().int().nonnegative(),
  provinceCount: z.number().int().nonnegative(),
});

export async function GET() {
  try {
    await requireSessionUser();
    const status = await getSipsDeclarationCount();
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    assertCanWriteCmoActivity(user);
    const body = setCountSchema.parse(await request.json());

    await withAudit(
      (tx) =>
        tx.sipsDeclarationCount.upsert({
          where: { id: SIPS_DECLARATION_COUNT_ID },
          create: { id: SIPS_DECLARATION_COUNT_ID, ...body, updatedById: user.id },
          update: { ...body, updatedById: user.id },
        }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "SipsDeclarationCount",
        entityId: SIPS_DECLARATION_COUNT_ID,
        diff: body,
      }
    );

    return NextResponse.json(await getSipsDeclarationCount(), { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

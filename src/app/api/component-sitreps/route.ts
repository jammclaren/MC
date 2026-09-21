import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteComponentSitRep } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { listComponentSitReps } from "@/lib/queries/component-sitreps";

const unitSchema = z.object({
  unitName: z.string().trim().min(1).max(120),
  strength: z.number().int().nonnegative(),
});

const assetSchema = z.object({
  assetName: z.string().trim().min(1).max(120),
  number: z.number().int().nonnegative(),
});

const createComponentSitRepSchema = z.object({
  units: z.array(unitSchema).default([]),
  assets: z.array(assetSchema).default([]),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    const rows = await listComponentSitReps(user);
    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

// component is never taken from the request body — it's always the
// reporting account's own User.component (assertCanWriteComponentSitRep
// already confirmed it's set), so an Air account can't submit a Naval
// report even by hand-crafting the request.
export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    assertCanWriteComponentSitRep(user);
    const body = createComponentSitRepSchema.parse(await request.json());

    const created = await withAudit(
      (tx) =>
        tx.componentSitRep.create({
          data: {
            createdById: user.id,
            component: user.component!,
            units: { create: body.units },
            assets: { create: body.assets },
          },
          include: { units: true, assets: true },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "ComponentSitRep",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

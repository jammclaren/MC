import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteIntelligenceUpdate } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { parseMgrs } from "@/lib/mgrs";

const createSchema = z.object({
  jtfId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  assetType: z.string().trim().min(1).max(120),
  quantity: z.number().int().nonnegative(),
  mgrs: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanWriteIntelligenceUpdate(user);
    const body = createSchema.parse(await request.json());

    const parsed = parseMgrs(body.mgrs);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { mgrs: _mgrs, ...rest } = body;
    void _mgrs;

    const created = await withAudit(
      (tx) =>
        tx.intelMeeAsset.create({
          data: { ...rest, lat: parsed.lat, lng: parsed.lng, createdById: user.id },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "IntelMeeAsset",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

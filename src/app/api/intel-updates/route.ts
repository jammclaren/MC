import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteIntelligenceUpdate } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { parseMgrs } from "@/lib/mgrs";

const createIntelUpdateSchema = z.object({
  category: z.enum(["NON_VIOLENT", "VIOLENT"]),
  activityType: z.string().trim().min(1).max(120),
  narrative: z.string().trim().min(1).max(4000),
  threatGroup: z.string().trim().max(120).optional(),
  province: z.string().trim().min(1).max(120),
  locationLabel: z.string().trim().min(1).max(200),
  mgrs: z.string().trim().min(1),
  date: z.coerce.date(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanWriteIntelligenceUpdate(user);
    const body = createIntelUpdateSchema.parse(await request.json());

    const parsed = parseMgrs(body.mgrs);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { mgrs: _mgrs, ...rest } = body;
    void _mgrs;

    const report = await withAudit(
      (tx) =>
        tx.intelUpdate.create({
          data: { ...rest, lat: parsed.lat, lng: parsed.lng, createdById: user.id },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "IntelUpdate",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

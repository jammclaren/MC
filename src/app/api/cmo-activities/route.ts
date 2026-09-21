import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteCmoActivity } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { parseMgrs } from "@/lib/mgrs";
import { listCmoActivities } from "@/lib/queries/cmo-activities";

const createCmoActivitySchema = z.object({
  category: z.enum(["PUBLIC_AFFAIRS", "CIVIL_AFFAIRS", "PSYOPS", "IEC"]),
  title: z.string().trim().min(1).max(160),
  narrative: z.string().trim().min(1).max(4000),
  locationLabel: z.string().trim().min(1).max(200),
  mgrs: z.string().trim().min(1),
  date: z.coerce.date(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    const rows = await listCmoActivities(user);
    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanWriteCmoActivity(user);
    const body = createCmoActivitySchema.parse(await request.json());

    const parsed = parseMgrs(body.mgrs);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { mgrs: _mgrs, ...rest } = body;
    void _mgrs;

    const created = await withAudit(
      (tx) =>
        tx.cmoActivity.create({
          data: { ...rest, lat: parsed.lat, lng: parsed.lng, createdById: user.id },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "CmoActivity",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

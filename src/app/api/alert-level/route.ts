import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteAlertLevel } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { getAlertLevelStatus, ALERT_LEVEL_STATUS_ID } from "@/lib/queries/alert-level";

const setLevelSchema = z.object({
  level: z.enum(["WHITE", "BLUE", "RED"]),
});

export async function GET() {
  try {
    await requireSessionUser();
    const status = await getAlertLevelStatus();
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}

// Only COMMAND/WFC Maneuver ("M2")/ADMIN decide the Alert Level — every
// other logged-in user can still read it (see GET above).
export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = setLevelSchema.parse(await request.json());
    assertCanWriteAlertLevel(user);

    await withAudit(
      (tx) =>
        tx.alertLevelStatus.upsert({
          where: { id: ALERT_LEVEL_STATUS_ID },
          create: { id: ALERT_LEVEL_STATUS_ID, level: body.level, updatedById: user.id },
          update: { level: body.level, updatedById: user.id },
        }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "AlertLevelStatus",
        entityId: ALERT_LEVEL_STATUS_ID,
        diff: body,
      }
    );

    return NextResponse.json(await getAlertLevelStatus(), { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

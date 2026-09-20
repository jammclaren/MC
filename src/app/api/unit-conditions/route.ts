import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { listUnitConditions } from "@/lib/queries/unit-conditions";

const pctSchema = z.number().int().min(0).max(100);

const upsertSchema = z.object({
  jtfId: z.string().min(1),
  taskGroupName: z.string().trim().min(1).max(200),
  /** The task group's name as currently stored, when editing/renaming an
   * existing one — omitted when adding a brand-new task group. Locates
   * the row to update; taskGroupName above is the value to save (which
   * may differ, i.e. a rename). */
  originalTaskGroupName: z.string().trim().min(1).max(200).optional(),
  personnelPct: pctSchema,
  equipmentPct: pctSchema,
  maintenancePct: pctSchema,
  facilityPct: pctSchema,
  trainingPct: pctSchema,
});

export async function GET() {
  try {
    await requireSessionUser();
    const rows = await listUnitConditions();
    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

// Same write scoping as SitRep/JtfAssessment: ADMIN can write any JTF,
// JTF_COMMANDER/JTF_STAFF/BRIGADE_STAFF only their own.
export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = upsertSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    // Look up by the name the row is currently saved under (rename case),
    // falling back to the new name itself (add-new / no-rename case).
    const lookupName = body.originalTaskGroupName ?? body.taskGroupName;

    const saved = await withAudit(
      (tx) =>
        tx.unitCondition.upsert({
          where: {
            jtfId_taskGroupName: { jtfId: body.jtfId, taskGroupName: lookupName },
          },
          create: {
            jtfId: body.jtfId,
            taskGroupName: body.taskGroupName,
            personnelPct: body.personnelPct,
            equipmentPct: body.equipmentPct,
            maintenancePct: body.maintenancePct,
            facilityPct: body.facilityPct,
            trainingPct: body.trainingPct,
            updatedById: user.id,
          },
          update: {
            taskGroupName: body.taskGroupName,
            personnelPct: body.personnelPct,
            equipmentPct: body.equipmentPct,
            maintenancePct: body.maintenancePct,
            facilityPct: body.facilityPct,
            trainingPct: body.trainingPct,
            updatedById: user.id,
          },
        }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "UnitCondition",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(saved, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

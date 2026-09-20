import { prisma } from "@/lib/prisma";
import { UNIT_CONDITION_CATEGORIES } from "@/lib/unit-condition";

export interface UnitConditionTaskGroupRow {
  id: string;
  taskGroupName: string;
  personnelPct: number;
  equipmentPct: number;
  maintenancePct: number;
  facilityPct: number;
  trainingPct: number;
  /** Average of the five category percentages, rounded. */
  overallPct: number;
  updatedAt: Date;
}

export interface UnitConditionJtfGroup {
  jtfId: string;
  jtfName: string;
  taskGroups: UnitConditionTaskGroupRow[];
}

/** One group per JTF, each holding one row per Task Group. Task Groups
 * here are directly managed (added/renamed/rated) through this feature —
 * not derived from SitRep, whose own TaskGroup rows are free-typed and
 * re-created on every submission with no stable identity (see
 * src/components/sitrep-form-dialog.tsx). A JTF with none yet shows an
 * empty list; the UI offers "Add Task Group" to create the first one. */
export async function listUnitConditions(): Promise<UnitConditionJtfGroup[]> {
  const [jtfs, conditions] = await Promise.all([
    prisma.jTF.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.unitCondition.findMany({ orderBy: { taskGroupName: "asc" } }),
  ]);

  const conditionsByJtf = new Map<string, typeof conditions>();
  for (const c of conditions) {
    const list = conditionsByJtf.get(c.jtfId) ?? [];
    list.push(c);
    conditionsByJtf.set(c.jtfId, list);
  }

  return jtfs.map((jtf) => ({
    jtfId: jtf.id,
    jtfName: jtf.name,
    taskGroups: (conditionsByJtf.get(jtf.id) ?? []).map((c) => ({
      id: c.id,
      taskGroupName: c.taskGroupName,
      personnelPct: c.personnelPct,
      equipmentPct: c.equipmentPct,
      maintenancePct: c.maintenancePct,
      facilityPct: c.facilityPct,
      trainingPct: c.trainingPct,
      overallPct: Math.round(
        UNIT_CONDITION_CATEGORIES.reduce((sum, cat) => sum + c[cat.key], 0) /
          UNIT_CONDITION_CATEGORIES.length
      ),
      updatedAt: c.updatedAt,
    })),
  }));
}

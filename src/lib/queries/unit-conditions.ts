import { prisma } from "@/lib/prisma";
import { UNIT_CONDITION_CATEGORIES } from "@/lib/unit-condition";

export interface UnitConditionTaskGroupRow {
  taskGroupName: string;
  personnelPct: number;
  equipmentPct: number;
  maintenancePct: number;
  facilityPct: number;
  trainingPct: number;
  /** Average of the five category percentages, rounded — null when no
   * rating has ever been submitted for this task group, so callers can
   * render "Not set" instead of a misleading 0%/R4. */
  overallPct: number | null;
  updatedAt: Date | null;
}

export interface UnitConditionJtfGroup {
  jtfId: string;
  jtfName: string;
  taskGroups: UnitConditionTaskGroupRow[];
}

function defaultRow(taskGroupName: string): UnitConditionTaskGroupRow {
  return {
    taskGroupName,
    personnelPct: 0,
    equipmentPct: 0,
    maintenancePct: 0,
    facilityPct: 0,
    trainingPct: 0,
    overallPct: null,
    updatedAt: null,
  };
}

/** One group per JTF, each holding one row per Task Group. Task Group
 * identity has no stable ID anywhere in this app (SitRep's TaskGroup rows
 * are free-typed and re-created every submission — see the UnitCondition
 * model's doc comment in schema.prisma), so "which task groups does this
 * JTF currently have" is taken as the distinct task group names on that
 * JTF's most recent SitRep. A JTF with no SitRep yet has zero task
 * groups. Ratings are matched against that name at read time; a rename
 * or typo in a later SitRep will show up as a fresh, unrated task group
 * rather than carrying the old rating forward. */
export async function listUnitConditions(): Promise<UnitConditionJtfGroup[]> {
  const [jtfs, latestSitReps, conditions] = await Promise.all([
    prisma.jTF.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.sitRep.findMany({
      orderBy: { reportedAt: "desc" },
      select: { jtfId: true, taskGroups: { select: { name: true } } },
    }),
    prisma.unitCondition.findMany(),
  ]);

  // sitReps are ordered latest-first; keep only the first (most recent)
  // one seen per JTF.
  const latestTaskGroupNamesByJtf = new Map<string, string[]>();
  for (const sitRep of latestSitReps) {
    if (latestTaskGroupNamesByJtf.has(sitRep.jtfId)) continue;
    const distinctNames = Array.from(new Set(sitRep.taskGroups.map((tg) => tg.name)));
    latestTaskGroupNamesByJtf.set(sitRep.jtfId, distinctNames);
  }

  const conditionByKey = new Map(
    conditions.map((c) => [`${c.jtfId}::${c.taskGroupName}`, c])
  );

  return jtfs.map((jtf) => {
    const taskGroupNames = latestTaskGroupNamesByJtf.get(jtf.id) ?? [];
    const taskGroups = taskGroupNames.map((name) => {
      const c = conditionByKey.get(`${jtf.id}::${name}`);
      if (!c) return defaultRow(name);
      const overallPct = Math.round(
        UNIT_CONDITION_CATEGORIES.reduce((sum, cat) => sum + c[cat.key], 0) /
          UNIT_CONDITION_CATEGORIES.length
      );
      return {
        taskGroupName: name,
        personnelPct: c.personnelPct,
        equipmentPct: c.equipmentPct,
        maintenancePct: c.maintenancePct,
        facilityPct: c.facilityPct,
        trainingPct: c.trainingPct,
        overallPct,
        updatedAt: c.updatedAt,
      };
    });
    return { jtfId: jtf.id, jtfName: jtf.name, taskGroups };
  });
}

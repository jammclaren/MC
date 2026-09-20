import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";

export interface JtfSitRepSummary {
  jtfId: string;
  jtfName: string;
  totalStrength: number;
  taskGroupCount: number;
  criticalAssetCount: number;
  checkpointOpsTotal: number;
}

/** DISPOLOC broken down by Task Group instead of by JTF — for a JTF
 * account's own Overview, where "by JTF" would just be a single row
 * repeating what the JTF card above it already shows. Checkpoint Ops
 * has no per-Task-Group equivalent (it's tracked per SitRep, not per
 * Task Group — see SitRep.checkpointOpsTotal), so it's left out here
 * rather than shown as a misleading repeated JTF-wide figure. */
export interface TaskGroupSitRepSummary {
  jtfId: string;
  jtfName: string;
  taskGroupName: string;
  totalStrength: number;
  criticalAssetCount: number;
}

export interface UnitBreakdownRow {
  unitName: string;
  jtfName: string;
  taskGroupName: string;
  strength: number;
}

export interface SitRepRow {
  id: string;
  jtfId: string;
  jtfName: string;
  createdByName: string;
  reportedAt: Date;
  taskGroups: {
    name: string;
    units: { unitName: string; strength: number }[];
    criticalAssets: string[];
  }[];
  checkpointOpsTotal: number;
  checkpointBreakdown: { location: string; unit: string; remarks: string | null }[];
  armedEngagement: {
    unitInvolved: string;
    confrontedThreat: string;
    location: string;
    results: string;
  } | null;
  significantActivities: string[];
  canDelete: boolean;
}

export interface SitRepData {
  jtfCards: JtfSitRepSummary[];
  taskGroupCards: TaskGroupSitRepSummary[];
  totalStrength: number;
  totalCriticalAssets: number;
  totalCheckpointOps: number;
  unitBreakdown: UnitBreakdownRow[];
  rows: SitRepRow[];
}

export async function getSitRepData(
  user: SessionUser,
  jtfId?: string | null,
  canWrite?: (jtfId: string) => boolean
): Promise<SitRepData> {
  // Per-JTF card totals are aggregate-only (a rollup view), the row-level
  // log below is full detail and stays strictly scoped — same convention
  // as the deployment/election-board pages before it.
  const cardScopeJtfId = scopeJtfFilter(user, jtfId, { allowRollup: true });
  const rowScopeJtfId = scopeJtfFilter(user, jtfId);

  const include = {
    jtf: { select: { name: true } },
    createdBy: { select: { name: true } },
    taskGroups: { include: { units: true, criticalAssets: true } },
    checkpointBreakdown: true,
    armedEngagement: true,
    significantActivities: { orderBy: { order: "asc" as const } },
  };

  const [jtfs, cardSitReps, rowSitReps] = await Promise.all([
    prisma.jTF.findMany({
      where: cardScopeJtfId ? { id: cardScopeJtfId } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.sitRep.findMany({
      where: { jtfId: cardScopeJtfId },
      include: { taskGroups: { include: { units: true, criticalAssets: true } } },
    }),
    prisma.sitRep.findMany({
      where: { jtfId: rowScopeJtfId },
      include,
      orderBy: { reportedAt: "desc" },
    }),
  ]);

  const taskGroupCards: TaskGroupSitRepSummary[] = [];
  const jtfCards: JtfSitRepSummary[] = jtfs.map((jtf) => {
    const jtfSitReps = cardSitReps.filter((s) => s.jtfId === jtf.id);
    const taskGroups = jtfSitReps.flatMap((s) => s.taskGroups);

    const byTaskGroupName = new Map<string, { strength: number; assets: number }>();
    for (const tg of taskGroups) {
      const strength = tg.units.reduce((s, u) => s + u.strength, 0);
      const entry = byTaskGroupName.get(tg.name) ?? { strength: 0, assets: 0 };
      entry.strength += strength;
      entry.assets += tg.criticalAssets.length;
      byTaskGroupName.set(tg.name, entry);
    }
    for (const [taskGroupName, { strength, assets }] of byTaskGroupName) {
      taskGroupCards.push({
        jtfId: jtf.id,
        jtfName: jtf.name,
        taskGroupName,
        totalStrength: strength,
        criticalAssetCount: assets,
      });
    }

    return {
      jtfId: jtf.id,
      jtfName: jtf.name,
      totalStrength: taskGroups.reduce(
        (sum, tg) => sum + tg.units.reduce((s, u) => s + u.strength, 0),
        0
      ),
      taskGroupCount: taskGroups.length,
      criticalAssetCount: taskGroups.reduce((sum, tg) => sum + tg.criticalAssets.length, 0),
      checkpointOpsTotal: jtfSitReps.reduce((sum, s) => sum + s.checkpointOpsTotal, 0),
    };
  });

  const unitBreakdown: UnitBreakdownRow[] = cardSitReps.flatMap((s) => {
    const jtf = jtfs.find((j) => j.id === s.jtfId);
    return s.taskGroups.flatMap((tg) =>
      tg.units.map((u) => ({
        unitName: u.unitName,
        jtfName: jtf?.name ?? "—",
        taskGroupName: tg.name,
        strength: u.strength,
      }))
    );
  });

  const rows: SitRepRow[] = rowSitReps.map((s) => ({
    id: s.id,
    jtfId: s.jtfId,
    jtfName: s.jtf.name,
    createdByName: s.createdBy.name,
    reportedAt: s.reportedAt,
    taskGroups: s.taskGroups.map((tg) => ({
      name: tg.name,
      units: tg.units.map((u) => ({ unitName: u.unitName, strength: u.strength })),
      criticalAssets: tg.criticalAssets.map((a) => a.unitName),
    })),
    checkpointOpsTotal: s.checkpointOpsTotal,
    checkpointBreakdown: s.checkpointBreakdown.map((c) => ({
      location: c.location,
      unit: c.unit,
      remarks: c.remarks,
    })),
    armedEngagement: s.armedEngagement
      ? {
          unitInvolved: s.armedEngagement.unitInvolved,
          confrontedThreat: s.armedEngagement.confrontedThreat,
          location: s.armedEngagement.location,
          results: s.armedEngagement.results,
        }
      : null,
    significantActivities: s.significantActivities.map((a) => a.text),
    canDelete: canWrite ? canWrite(s.jtfId) : false,
  }));

  return {
    jtfCards,
    taskGroupCards,
    totalStrength: jtfCards.reduce((sum, c) => sum + c.totalStrength, 0),
    totalCriticalAssets: jtfCards.reduce((sum, c) => sum + c.criticalAssetCount, 0),
    totalCheckpointOps: jtfCards.reduce((sum, c) => sum + c.checkpointOpsTotal, 0),
    unitBreakdown,
    rows,
  };
}

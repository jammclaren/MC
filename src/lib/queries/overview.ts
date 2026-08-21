import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import {
  computePriorityScore,
  PRIORITY_FLAG_THRESHOLD,
  RECENT_INCIDENT_WINDOW_DAYS,
} from "@/lib/priority-score";
import { getScoredAreas } from "@/lib/queries/priority-areas";

export interface JtfDeploymentTotal {
  jtfId: string;
  jtfName: string;
  deployedToPolling: number;
  qrf: number;
}

export interface CategorySummary {
  category: "CTG" | "LTG" | "CBC";
  targetYE: number;
  actual: number;
}

export interface RecentIncidentRow {
  id: string;
  date: Date;
  type: string;
  result: string | null;
  jtfName: string;
  areaLabel: string | null;
  isPriority: boolean;
}

export interface OverviewData {
  jtfDeployments: JtfDeploymentTotal[];
  totalDeployed: number;
  totalQrf: number;
  categorySummaries: CategorySummary[];
  recentIncidents: RecentIncidentRow[];
  recentIncidentCount30d: number;
  priorityAreaCount: number;
}

export async function getOverviewData(user: SessionUser): Promise<OverviewData> {
  // Deployment totals and category sums are aggregate-only, so JTF_COMMANDER
  // sees them command-wide (their "rollup-only" read scope for other JTFs).
  // The recent-incidents list is row-level detail and stays strictly scoped.
  const rollupScopeJtfId = scopeJtfFilter(user, undefined, { allowRollup: true });
  const detailScopeJtfId = scopeJtfFilter(user);
  const windowStart = new Date(
    Date.now() - RECENT_INCIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [jtfs, deployments, indicators, recentIncidents, recentIncidentCount30d, scoredAreas] =
    await Promise.all([
    prisma.jTF.findMany({
      where: rollupScopeJtfId ? { id: rollupScopeJtfId } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.troopDeployment.findMany({
      where: { jtfId: rollupScopeJtfId },
      select: { jtfId: true, deployedToPolling: true, qrf: true },
    }),
    prisma.indicator.findMany({
      include: {
        records: { where: { jtfId: rollupScopeJtfId } },
      },
    }),
    prisma.incident.findMany({
      where: { jtfId: detailScopeJtfId },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        jtf: { select: { name: true } },
        electionArea: {
          include: {
            incidents: {
              where: { date: { gte: windowStart } },
              select: { type: true, date: true },
            },
            deployments: { select: { deployedToPolling: true } },
          },
        },
      },
    }),
    prisma.incident.count({
      where: { jtfId: detailScopeJtfId, date: { gte: windowStart } },
    }),
    getScoredAreas(user),
  ]);

  const priorityAreaCount = scoredAreas.filter(
    (area) => area.priorityScore >= PRIORITY_FLAG_THRESHOLD
  ).length;

  const jtfDeployments: JtfDeploymentTotal[] = jtfs.map((jtf) => {
    const rows = deployments.filter((d) => d.jtfId === jtf.id);
    return {
      jtfId: jtf.id,
      jtfName: jtf.name,
      deployedToPolling: rows.reduce((sum, r) => sum + r.deployedToPolling, 0),
      qrf: rows.reduce((sum, r) => sum + r.qrf, 0),
    };
  });

  const categorySummaries: CategorySummary[] = (["CTG", "LTG", "CBC"] as const).map(
    (category) => {
      const categoryIndicators = indicators.filter((i) => i.category === category);
      return {
        category,
        targetYE: categoryIndicators.reduce((sum, i) => sum + (i.targetYE ?? 0), 0),
        actual: categoryIndicators.reduce(
          (sum, i) => sum + i.records.reduce((s, r) => s + r.count, 0),
          0
        ),
      };
    }
  );

  const recentIncidentRows: RecentIncidentRow[] = recentIncidents.map((incident) => {
    let isPriority = false;
    if (incident.electionArea) {
      const area = incident.electionArea;
      const deployedToPolling = area.deployments.reduce(
        (sum, d) => sum + d.deployedToPolling,
        0
      );
      const score = computePriorityScore({
        hotspotCategory: area.hotspotCategory,
        incidents: area.incidents,
        deployedToPolling,
        registeredVoters: area.registeredVoters,
      });
      isPriority = score >= PRIORITY_FLAG_THRESHOLD;
    }

    const areaLabel = incident.electionArea
      ? [incident.electionArea.barangay, incident.electionArea.municipality]
          .filter(Boolean)
          .join(", ") || incident.electionArea.province
      : null;

    return {
      id: incident.id,
      date: incident.date,
      type: incident.type,
      result: incident.result,
      jtfName: incident.jtf.name,
      areaLabel,
      isPriority,
    };
  });

  return {
    jtfDeployments,
    totalDeployed: jtfDeployments.reduce((sum, d) => sum + d.deployedToPolling, 0),
    totalQrf: jtfDeployments.reduce((sum, d) => sum + d.qrf, 0),
    categorySummaries,
    recentIncidents: recentIncidentRows,
    recentIncidentCount30d,
    priorityAreaCount,
  };
}

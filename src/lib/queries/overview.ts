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

export interface FunnelStage {
  label: string;
  count: number;
}

export interface IncidentsByDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface PriorityAreaSummary {
  id: string;
  label: string;
  hotspotCategory: string | null;
  priorityScore: number;
}

export interface OverviewData {
  jtfDeployments: JtfDeploymentTotal[];
  totalDeployed: number;
  totalQrf: number;
  totalRegisteredVoters: number;
  categorySummaries: CategorySummary[];
  recentIncidents: RecentIncidentRow[];
  recentIncidentCount30d: number;
  priorityAreaCount: number;
  electionOpsFunnel: FunnelStage[];
  incidentsByDay: IncidentsByDay[];
  topPriorityAreas: PriorityAreaSummary[];
  bpe: {
    startDate: string; // ISO timestamp
    endDate: string; // ISO timestamp
  };
}

// BPE 2026 election security operations window (SPEC.md §1).
const BPE_START = new Date("2026-07-30T00:00:00Z");
// 23:59:59 Asia/Manila (UTC+8) on 14 Sept 2026.
const BPE_END = new Date("2026-09-14T15:59:59Z");
const INCIDENTS_BY_DAY_WINDOW = 14;

export async function getOverviewData(user: SessionUser): Promise<OverviewData> {
  // Deployment totals and category sums are aggregate-only, so JTF_COMMANDER
  // sees them command-wide (their "rollup-only" read scope for other JTFs).
  // The recent-incidents list is row-level detail and stays strictly scoped.
  const rollupScopeJtfId = scopeJtfFilter(user, undefined, { allowRollup: true });
  const detailScopeJtfId = scopeJtfFilter(user);
  const windowStart = new Date(
    Date.now() - RECENT_INCIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [
    jtfs,
    deployments,
    indicators,
    recentIncidents,
    recentIncidentCount30d,
    scoredAreas,
    electionAreasForRollup,
    incidentsForDailyChart,
  ] = await Promise.all([
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
    // Scoped to areas actively tracked for BPE polling ops (they have an
    // ElectionOpsStatus row) — excludes barangay-level threat-categorization
    // entries that exist purely for the hotspot/priority map, so those don't
    // inflate "Total Areas" in the funnel below.
    prisma.electionArea.findMany({
      where: { jtfId: rollupScopeJtfId, opsStatus: { isNot: null } },
      select: { registeredVoters: true, opsStatus: true },
    }),
    prisma.incident.findMany({
      where: {
        jtfId: detailScopeJtfId,
        date: { gte: new Date(Date.now() - INCIDENTS_BY_DAY_WINDOW * 24 * 60 * 60 * 1000) },
      },
      select: { date: true },
    }),
  ]);

  const priorityAreaCount = scoredAreas.filter(
    (area) => area.priorityScore >= PRIORITY_FLAG_THRESHOLD
  ).length;

  const totalRegisteredVoters = electionAreasForRollup.reduce(
    (sum, area) => sum + (area.registeredVoters ?? 0),
    0
  );

  const totalAreas = electionAreasForRollup.length;
  const countWhere = (predicate: (status: NonNullable<(typeof electionAreasForRollup)[number]["opsStatus"]>) => boolean) =>
    electionAreasForRollup.filter((a) => a.opsStatus && predicate(a.opsStatus)).length;

  const electionOpsFunnel: FunnelStage[] = [
    { label: "Total Areas", count: totalAreas },
    {
      label: "Paraphernalia Delivered",
      count: countWhere(
        (s) =>
          s.paraphTotalPrecinct != null &&
          s.paraphTotalPrecinct > 0 &&
          s.paraphDeliveredPrecinct === s.paraphTotalPrecinct
      ),
    },
    { label: "ACM Tested & Sealed", count: countWhere((s) => s.acmTestedSealed) },
    { label: "Voting Started", count: countWhere((s) => s.votingStarted) },
    { label: "Voting Closed", count: countWhere((s) => s.votingClosed) },
    { label: "Provincial Proclaimed", count: countWhere((s) => s.provincialProclaimed) },
  ];

  const incidentsByDayMap = new Map<string, number>();
  const today = new Date();
  for (let i = INCIDENTS_BY_DAY_WINDOW - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    incidentsByDayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const incident of incidentsForDailyChart) {
    const key = incident.date.toISOString().slice(0, 10);
    if (incidentsByDayMap.has(key)) {
      incidentsByDayMap.set(key, (incidentsByDayMap.get(key) ?? 0) + 1);
    }
  }
  const incidentsByDay: IncidentsByDay[] = Array.from(incidentsByDayMap.entries()).map(
    ([date, count]) => ({ date, count })
  );

  const topPriorityAreas: PriorityAreaSummary[] = scoredAreas.slice(0, 5).map((area) => ({
    id: area.id,
    label:
      [area.barangay, area.municipality, area.province].filter(Boolean).join(", ") ||
      area.province,
    hotspotCategory: area.hotspotCategory,
    priorityScore: area.priorityScore,
  }));

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
    totalRegisteredVoters,
    categorySummaries,
    recentIncidents: recentIncidentRows,
    recentIncidentCount30d,
    priorityAreaCount,
    electionOpsFunnel,
    incidentsByDay,
    topPriorityAreas,
    bpe: {
      startDate: BPE_START.toISOString(),
      endDate: BPE_END.toISOString(),
    },
  };
}

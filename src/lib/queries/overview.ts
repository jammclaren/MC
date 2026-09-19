import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import {
  computePriorityScore,
  PRIORITY_FLAG_THRESHOLD,
  RECENT_INCIDENT_WINDOW_DAYS,
} from "@/lib/priority-score";
import { getScoredAreas } from "@/lib/queries/priority-areas";
import { getSitRepData, type JtfSitRepSummary } from "@/lib/queries/sitreps";

export interface RecentIncidentRow {
  id: string;
  date: Date;
  type: string;
  result: string | null;
  jtfName: string;
  areaLabel: string | null;
  isPriority: boolean;
}

export interface IncidentsByDay {
  date: string; // YYYY-MM-DD
  count: number;
  /** Unique incident type keywords for the day, e.g. ["Harassment", "Rally"]
   * — feeds the chart tooltip's short breakdown alongside the count. */
  types: string[];
}

export interface PriorityAreaSummary {
  id: string;
  label: string;
  province: string;
  hotspotCategory: string | null;
  priorityScore: number;
}

export interface OverviewData {
  jtfSitReps: JtfSitRepSummary[];
  totalStrength: number;
  totalCriticalAssets: number;
  totalCheckpointOps: number;
  totalRegisteredVoters: number;
  recentIncidents: RecentIncidentRow[];
  recentIncidentCount30d: number;
  priorityAreaCount: number;
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
    sitRepData,
    recentIncidents,
    recentIncidentCount30d,
    scoredAreas,
    registeredVotersAgg,
    incidentsForDailyChart,
  ] = await Promise.all([
    getSitRepData(user),
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
          },
        },
      },
    }),
    prisma.incident.count({
      where: { jtfId: detailScopeJtfId, date: { gte: windowStart } },
    }),
    getScoredAreas(user),
    prisma.electionArea.aggregate({
      where: { jtfId: rollupScopeJtfId },
      _sum: { registeredVoters: true },
    }),
    prisma.incident.findMany({
      where: {
        jtfId: detailScopeJtfId,
        date: { gte: new Date(Date.now() - INCIDENTS_BY_DAY_WINDOW * 24 * 60 * 60 * 1000) },
      },
      select: { date: true, type: true },
    }),
  ]);

  const priorityAreaCount = scoredAreas.filter(
    (area) => area.priorityScore >= PRIORITY_FLAG_THRESHOLD
  ).length;

  const totalRegisteredVoters = registeredVotersAgg._sum.registeredVoters ?? 0;

  const incidentsByDayMap = new Map<string, { count: number; types: Set<string> }>();
  const today = new Date();
  for (let i = INCIDENTS_BY_DAY_WINDOW - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    incidentsByDayMap.set(d.toISOString().slice(0, 10), { count: 0, types: new Set() });
  }
  for (const incident of incidentsForDailyChart) {
    const key = incident.date.toISOString().slice(0, 10);
    const entry = incidentsByDayMap.get(key);
    if (entry) {
      entry.count += 1;
      entry.types.add(incident.type);
    }
  }
  const incidentsByDay: IncidentsByDay[] = Array.from(incidentsByDayMap.entries()).map(
    ([date, { count, types }]) => ({ date, count, types: Array.from(types) })
  );

  const topPriorityAreas: PriorityAreaSummary[] = scoredAreas.slice(0, 5).map((area) => ({
    id: area.id,
    label:
      [area.barangay, area.municipality, area.province].filter(Boolean).join(", ") ||
      area.province,
    province: area.province,
    hotspotCategory: area.hotspotCategory,
    priorityScore: area.priorityScore,
  }));

  const recentIncidentRows: RecentIncidentRow[] = recentIncidents.map((incident) => {
    let isPriority = false;
    if (incident.electionArea) {
      const area = incident.electionArea;
      // See priority-areas.ts — SITREP has no per-area deployment figure,
      // so the coverage deduction is always 0 here now.
      const score = computePriorityScore({
        hotspotCategory: area.hotspotCategory,
        incidents: area.incidents,
        deployedToPolling: 0,
        registeredVoters: area.registeredVoters,
      });
      isPriority = score >= PRIORITY_FLAG_THRESHOLD;
    }

    const areaLabel =
      incident.locationLabel ||
      (incident.electionArea
        ? [incident.electionArea.barangay, incident.electionArea.municipality]
            .filter(Boolean)
            .join(", ") || incident.electionArea.province
        : null);

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
    jtfSitReps: sitRepData.jtfCards,
    totalStrength: sitRepData.totalStrength,
    totalCriticalAssets: sitRepData.totalCriticalAssets,
    totalCheckpointOps: sitRepData.totalCheckpointOps,
    totalRegisteredVoters,
    recentIncidents: recentIncidentRows,
    recentIncidentCount30d,
    priorityAreaCount,
    incidentsByDay,
    topPriorityAreas,
    bpe: {
      startDate: BPE_START.toISOString(),
      endDate: BPE_END.toISOString(),
    },
  };
}

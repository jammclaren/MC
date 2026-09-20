import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import { getSitRepData, type JtfSitRepSummary, type TaskGroupSitRepSummary } from "@/lib/queries/sitreps";

// How far back "recent incidents" looks for the 30-day count and
// window-scoped queries below.
const RECENT_INCIDENT_WINDOW_DAYS = 30;

export interface RecentIncidentRow {
  id: string;
  date: Date;
  type: string;
  result: string | null;
  jtfName: string;
  areaLabel: string | null;
}

export interface IncidentsByDay {
  date: string; // YYYY-MM-DD
  count: number;
  /** Unique incident type keywords for the day, e.g. ["Harassment", "Rally"]
   * — feeds the chart tooltip's short breakdown alongside the count. */
  types: string[];
}

export interface OverviewData {
  jtfSitReps: JtfSitRepSummary[];
  taskGroupSitReps: TaskGroupSitRepSummary[];
  totalStrength: number;
  totalCriticalAssets: number;
  totalCheckpointOps: number;
  totalRegisteredVoters: number;
  recentIncidents: RecentIncidentRow[];
  recentIncidentCount30d: number;
  incidentsByDay: IncidentsByDay[];
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
        electionArea: { select: { barangay: true, municipality: true, province: true } },
      },
    }),
    prisma.incident.count({
      where: { jtfId: detailScopeJtfId, date: { gte: windowStart } },
    }),
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

  const recentIncidentRows: RecentIncidentRow[] = recentIncidents.map((incident) => {
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
    };
  });

  return {
    jtfSitReps: sitRepData.jtfCards,
    taskGroupSitReps: sitRepData.taskGroupCards,
    totalStrength: sitRepData.totalStrength,
    totalCriticalAssets: sitRepData.totalCriticalAssets,
    totalCheckpointOps: sitRepData.totalCheckpointOps,
    totalRegisteredVoters,
    recentIncidents: recentIncidentRows,
    recentIncidentCount30d,
    incidentsByDay,
    bpe: {
      startDate: BPE_START.toISOString(),
      endDate: BPE_END.toISOString(),
    },
  };
}

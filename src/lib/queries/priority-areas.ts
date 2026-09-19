import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import {
  computePriorityScore,
  RECENT_INCIDENT_WINDOW_DAYS,
} from "@/lib/priority-score";

export interface ScoredArea {
  id: string;
  jtfId: string;
  province: string;
  municipality: string | null;
  barangay: string | null;
  hotspotCategory: string | null;
  registeredVoters: number | null;
  numPrecincts: number | null;
  numCenters: number | null;
  lat: number | null;
  lng: number | null;
  deployedToPolling: number;
  recentIncidentCount: number;
  openIncidentCount: number;
  priorityScore: number;
}

export async function getScoredAreas(user: SessionUser): Promise<ScoredArea[]> {
  // Hotspot/priority visibility is itself a command-wide rollup concern —
  // JTF_COMMANDER's "other JTFs rollup-only" scope applies here too.
  const scopeJtfId = scopeJtfFilter(user, undefined, { allowRollup: true });

  const windowStart = new Date(
    Date.now() - RECENT_INCIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const areas = await prisma.electionArea.findMany({
    where: { jtfId: scopeJtfId },
    include: {
      incidents: {
        where: { date: { gte: windowStart } },
        select: { type: true, date: true },
      },
    },
  });

  return areas
    .map((area) => {
      // SITREP (which replaced the old per-area TroopDeployment log) is
      // reported at JTF/Task-Group level with no area linkage, so there is
      // no longer a per-area deployment figure to deduct here — the
      // coverage-deduction term in computePriorityScore always evaluates
      // to 0 now, and priority score is effectively hotspot + incident
      // severity only. Kept as an explicit 0 (not removed from the
      // formula) so this is easy to reconnect if a future SITREP revision
      // adds area-level location back.
      const deployedToPolling = 0;
      const priorityScore = computePriorityScore({
        hotspotCategory: area.hotspotCategory,
        incidents: area.incidents,
        deployedToPolling,
        registeredVoters: area.registeredVoters,
      });
      return {
        id: area.id,
        jtfId: area.jtfId,
        province: area.province,
        municipality: area.municipality,
        barangay: area.barangay,
        hotspotCategory: area.hotspotCategory,
        registeredVoters: area.registeredVoters,
        numPrecincts: area.numPrecincts,
        numCenters: area.numCenters,
        lat: area.lat,
        lng: area.lng,
        deployedToPolling,
        recentIncidentCount: area.incidents.length,
        openIncidentCount: area.incidents.length,
        priorityScore,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

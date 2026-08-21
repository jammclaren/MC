import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import {
  computePriorityScore,
  RECENT_INCIDENT_WINDOW_DAYS,
} from "@/lib/priority-score";

export interface ScoredArea {
  id: string;
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
      deployments: { select: { deployedToPolling: true } },
    },
  });

  return areas
    .map((area) => {
      const deployedToPolling = area.deployments.reduce(
        (sum, deployment) => sum + deployment.deployedToPolling,
        0
      );
      const priorityScore = computePriorityScore({
        hotspotCategory: area.hotspotCategory,
        incidents: area.incidents,
        deployedToPolling,
        registeredVoters: area.registeredVoters,
      });
      return {
        id: area.id,
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

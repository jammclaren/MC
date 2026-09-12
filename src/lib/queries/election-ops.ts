import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import { safePercent } from "@/lib/percentages";

export async function listElectionOpsAreas(user: SessionUser, jtfId?: string) {
  const scopeJtfId = scopeJtfFilter(user, jtfId);

  const areas = await prisma.electionArea.findMany({
    where: { jtfId: scopeJtfId },
    include: { jtf: { select: { name: true } }, opsStatus: true, pollingCenters: true },
    orderBy: [{ province: "asc" }, { municipality: "asc" }, { barangay: "asc" }],
  });

  return areas.map((area) => {
    const status = area.opsStatus;
    return {
      id: area.id,
      jtfId: area.jtfId,
      jtfName: area.jtf.name,
      label:
        [area.barangay, area.municipality, area.province].filter(Boolean).join(", ") ||
        area.province,
      province: area.province,
      municipality: area.municipality,
      barangay: area.barangay,
      hotspotCategory: area.hotspotCategory,
      hotspotReason: area.hotspotReason,
      numPrecincts: area.numPrecincts,
      numCenters: area.numCenters,
      pollingCenters: area.pollingCenters.map((pc) => ({
        id: pc.id,
        name: pc.name,
        numPrecincts: pc.numPrecincts,
      })),
      registeredVoters: area.registeredVoters,
      lat: area.lat,
      lng: area.lng,
      status: status
        ? {
            paraphTotalTreasurer: status.paraphTotalTreasurer,
            paraphDeliveredTreasurer: status.paraphDeliveredTreasurer,
            paraphTreasurerPct: safePercent(
              status.paraphDeliveredTreasurer,
              status.paraphTotalTreasurer
            ),
            paraphTotalPrecinct: status.paraphTotalPrecinct,
            paraphDeliveredPrecinct: status.paraphDeliveredPrecinct,
            paraphPrecinctPct: safePercent(
              status.paraphDeliveredPrecinct,
              status.paraphTotalPrecinct
            ),
            paraphLocation: status.paraphLocation,
            acmTestedSealed: status.acmTestedSealed,
            votingStarted: status.votingStarted,
            votingClosed: status.votingClosed,
            transmissionStatus: status.transmissionStatus,
            municipalCanvassPct: status.municipalCanvassPct,
            municipalProclaimed: status.municipalProclaimed,
            provincialCanvassPct: status.provincialCanvassPct,
            provincialProclaimed: status.provincialProclaimed,
          }
        : null,
    };
  });
}

export type ElectionOpsAreaRow = Awaited<ReturnType<typeof listElectionOpsAreas>>[number];

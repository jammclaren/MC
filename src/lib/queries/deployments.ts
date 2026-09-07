import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";

export interface JtfDeploymentCard {
  jtfId: string;
  jtfName: string;
  deployedToPolling: number;
  deployedToPollingCenters: number;
  qrf: number;
  pnpDeployed: number;
  wavsTav: number;
  airAssetCount: number;
  navalAssetCount: number;
  numPrecincts: number;
  registeredVoters: number;
}

export interface DeploymentRow {
  id: string;
  jtfId: string;
  jtfName: string;
  electionAreaId: string | null;
  unitLabel: string | null;
  areaLabel: string | null;
  deployedToPolling: number;
  deployedToPollingCenters: number;
  qrf: number;
  afpOfficers: number;
  afpEnlisted: number;
  caa: number;
  wavsTav: number;
  pnpOfficers: number;
  pnpEnlisted: number;
  checkpointOps: number;
  airAssetType: string | null;
  airAssetCount: number;
  navalAssetType: string | null;
  navalAssetCount: number;
  reportedAt: Date;
}

export interface DeploymentData {
  jtfCards: JtfDeploymentCard[];
  totalDeployed: number;
  totalDeployedToPollingCenters: number;
  totalQrf: number;
  totalAirAssets: number;
  totalNavalAssets: number;
  rows: DeploymentRow[];
}

export async function getDeploymentData(
  user: SessionUser,
  jtfId?: string | null
): Promise<DeploymentData> {
  // Per-JTF card totals are aggregate-only (a rollup view), the row-level
  // table below is full detail and stays strictly scoped.
  const cardScopeJtfId = scopeJtfFilter(user, jtfId, { allowRollup: true });
  const rowScopeJtfId = scopeJtfFilter(user, jtfId);

  const [jtfs, cardDeployments, rowDeployments, areasByJtf] = await Promise.all([
    prisma.jTF.findMany({
      where: cardScopeJtfId ? { id: cardScopeJtfId } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.troopDeployment.findMany({
      where: { jtfId: cardScopeJtfId },
      select: {
        jtfId: true,
        deployedToPolling: true,
        deployedToPollingCenters: true,
        qrf: true,
        pnpOfficers: true,
        pnpEnlisted: true,
        wavsTav: true,
        airAssetCount: true,
        navalAssetCount: true,
      },
    }),
    prisma.troopDeployment.findMany({
      where: { jtfId: rowScopeJtfId },
      include: { jtf: { select: { name: true } }, electionArea: true },
      orderBy: { reportedAt: "desc" },
    }),
    prisma.electionArea.groupBy({
      by: ["jtfId"],
      where: { jtfId: cardScopeJtfId },
      _sum: { numPrecincts: true, registeredVoters: true },
    }),
  ]);

  const jtfCards: JtfDeploymentCard[] = jtfs.map((jtf) => {
    const deployRows = cardDeployments.filter((d) => d.jtfId === jtf.id);
    const areaAgg = areasByJtf.find((a) => a.jtfId === jtf.id);
    return {
      jtfId: jtf.id,
      jtfName: jtf.name,
      deployedToPolling: deployRows.reduce((sum, r) => sum + r.deployedToPolling, 0),
      deployedToPollingCenters: deployRows.reduce((sum, r) => sum + r.deployedToPollingCenters, 0),
      qrf: deployRows.reduce((sum, r) => sum + r.qrf, 0),
      pnpDeployed: deployRows.reduce((sum, r) => sum + r.pnpOfficers + r.pnpEnlisted, 0),
      wavsTav: deployRows.reduce((sum, r) => sum + r.wavsTav, 0),
      airAssetCount: deployRows.reduce((sum, r) => sum + r.airAssetCount, 0),
      navalAssetCount: deployRows.reduce((sum, r) => sum + r.navalAssetCount, 0),
      numPrecincts: areaAgg?._sum.numPrecincts ?? 0,
      registeredVoters: areaAgg?._sum.registeredVoters ?? 0,
    };
  });

  const rows: DeploymentRow[] = rowDeployments.map((d) => ({
    id: d.id,
    jtfId: d.jtfId,
    jtfName: d.jtf.name,
    electionAreaId: d.electionAreaId,
    unitLabel: d.unitLabel,
    areaLabel: d.electionArea
      ? [d.electionArea.barangay, d.electionArea.municipality]
          .filter(Boolean)
          .join(", ") || d.electionArea.province
      : null,
    deployedToPolling: d.deployedToPolling,
    deployedToPollingCenters: d.deployedToPollingCenters,
    qrf: d.qrf,
    afpOfficers: d.afpOfficers,
    afpEnlisted: d.afpEnlisted,
    caa: d.caa,
    wavsTav: d.wavsTav,
    pnpOfficers: d.pnpOfficers,
    pnpEnlisted: d.pnpEnlisted,
    checkpointOps: d.checkpointOps,
    airAssetType: d.airAssetType,
    airAssetCount: d.airAssetCount,
    navalAssetType: d.navalAssetType,
    navalAssetCount: d.navalAssetCount,
    reportedAt: d.reportedAt,
  }));

  return {
    jtfCards,
    totalDeployed: jtfCards.reduce((sum, c) => sum + c.deployedToPolling, 0),
    totalDeployedToPollingCenters: jtfCards.reduce((sum, c) => sum + c.deployedToPollingCenters, 0),
    totalQrf: jtfCards.reduce((sum, c) => sum + c.qrf, 0),
    totalAirAssets: jtfCards.reduce((sum, c) => sum + c.airAssetCount, 0),
    totalNavalAssets: jtfCards.reduce((sum, c) => sum + c.navalAssetCount, 0),
    rows,
  };
}

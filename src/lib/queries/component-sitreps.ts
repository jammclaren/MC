import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/rbac";
import type { ComponentType } from "@/generated/prisma/client";

export interface ComponentSitRepUnitRow {
  unitName: string;
  strength: number;
}

export interface ComponentSitRepAssetRow {
  assetName: string;
  number: number;
}

export interface ComponentSitRepRow {
  id: string;
  createdByName: string;
  component: ComponentType;
  reportedAt: Date;
  units: ComponentSitRepUnitRow[];
  assets: ComponentSitRepAssetRow[];
  totalAssets: number;
}

/** Component Command's own SITREP log — standalone, not JTF-scoped, and
 * single-component per report (see ComponentSitRep in schema.prisma). An
 * Air/Naval Component account only ever sees its own submissions; ADMIN
 * sees every account's, same "sees everything" posture it has elsewhere
 * in this app (it just can't write one — see canWriteComponentSitRep). */
export async function listComponentSitReps(user: SessionUser): Promise<ComponentSitRepRow[]> {
  const rows = await prisma.componentSitRep.findMany({
    where: user.role === "ADMIN" ? undefined : { createdById: user.id },
    include: {
      units: true,
      assets: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { reportedAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    createdByName: r.createdBy.name,
    component: r.component,
    reportedAt: r.reportedAt,
    units: r.units.map((u) => ({ unitName: u.unitName, strength: u.strength })),
    assets: r.assets.map((a) => ({ assetName: a.assetName, number: a.number })),
    totalAssets: r.assets.reduce((sum, a) => sum + a.number, 0),
  }));
}

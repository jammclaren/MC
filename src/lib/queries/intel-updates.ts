import { prisma } from "@/lib/prisma";
import { assertCanAccessIntelligenceUpdate, type SessionUser } from "@/lib/rbac";
import { toMgrs } from "@/lib/mgrs";

export type IntelCategory = "NON_VIOLENT" | "VIOLENT";

export interface IntelUpdateRow {
  id: string;
  category: IntelCategory;
  activityType: string | null;
  narrative: string;
  threatGroup: string | null;
  province: string;
  locationLabel: string;
  lat: number;
  lng: number;
  mgrs: string;
  date: string;
  createdByName: string;
  createdAt: string;
}

export async function listIntelUpdates(user: SessionUser): Promise<IntelUpdateRow[]> {
  assertCanAccessIntelligenceUpdate(user);
  const rows = await prisma.intelUpdate.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    activityType: r.activityType,
    narrative: r.narrative,
    threatGroup: r.threatGroup,
    province: r.province,
    locationLabel: r.locationLabel,
    lat: r.lat,
    lng: r.lng,
    mgrs: toMgrs(r.lat, r.lng),
    date: r.date.toISOString(),
    createdByName: r.createdBy.name,
    createdAt: r.createdAt.toISOString(),
  }));
}

import { prisma } from "@/lib/prisma";
import { assertCanAccessCmoWorkspace, canWriteCmoActivity, type SessionUser } from "@/lib/rbac";
import { toMgrs } from "@/lib/mgrs";
import type { CmoActivityCategory } from "@/generated/prisma/client";

export type { CmoActivityCategory };

export interface CmoActivityRow {
  id: string;
  category: CmoActivityCategory;
  title: string;
  narrative: string;
  locationLabel: string;
  lat: number;
  lng: number;
  mgrs: string;
  date: string;
  createdByName: string;
  createdAt: string;
  canModify: boolean;
}

// CMO Workspace has no JTF/command scoping at all (see canAccessCmoWorkspace)
// — every activity is visible to anyone who can reach the page, same as
// the rest of this feature.
export async function listCmoActivities(user: SessionUser): Promise<CmoActivityRow[]> {
  assertCanAccessCmoWorkspace(user);
  const canModify = canWriteCmoActivity(user);
  const rows = await prisma.cmoActivity.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    narrative: r.narrative,
    locationLabel: r.locationLabel,
    lat: r.lat,
    lng: r.lng,
    mgrs: toMgrs(r.lat, r.lng),
    date: r.date.toISOString(),
    createdByName: r.createdBy.name,
    createdAt: r.createdAt.toISOString(),
    canModify,
  }));
}

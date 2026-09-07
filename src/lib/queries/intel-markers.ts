import { prisma } from "@/lib/prisma";
import { canAccessIntelligenceUpdate, type SessionUser } from "@/lib/rbac";

export interface IntelMarker {
  id: string;
  category: "NON_VIOLENT" | "VIOLENT";
  activity: string;
  threatGroup: string | null;
  province: string;
  lat: number;
  lng: number;
  createdAt: string;
}

/** Feeds the Situation Map's "Enemy Activity" layer — returns an
 * empty list for any role without canAccessIntelligenceUpdate rather than
 * throwing, so the map page can fetch this unconditionally and simply
 * render nothing for roles that shouldn't see it (same posture as the
 * page/nav gates in rbac.ts, applied at the data layer too). */
export async function getIntelMarkers(user: SessionUser): Promise<IntelMarker[]> {
  if (!canAccessIntelligenceUpdate(user)) return [];

  const rows = await prisma.intelUpdate.findMany({
    orderBy: { date: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    activity: r.activity,
    threatGroup: r.threatGroup,
    province: r.province,
    lat: r.lat,
    lng: r.lng,
    createdAt: r.createdAt.toISOString(),
  }));
}

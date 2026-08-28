import { prisma } from "@/lib/prisma";
import { canModifyEntry, scopeJtfFilter, type SessionUser } from "@/lib/rbac";

export interface IncidentMarker {
  id: string;
  jtfId: string;
  jtfName: string;
  electionAreaId: string | null;
  type: string;
  result: string | null;
  date: string;
  lat: number;
  lng: number;
  markerStyle: "NONE" | "BLINK" | "PULSE";
  source: "LOGGED" | "MAP_MARKER";
  /** When the record was created — used to auto-pulse just-logged incidents
   * on the map regardless of their chosen markerStyle (see priority-map.tsx). */
  createdAt: string;
  areaLabel: string | null;
  /** Whether the current user may edit/delete this marker
   * (`canModifyEntry`) — resolved server-side rather than shipping
   * `createdById` to the client. */
  canModify: boolean;
}

/** Individual incidents are row-level detail (SPEC.md §6 rollup note) —
 * strictly scoped to the caller's own JTF, same as the Incidents log and
 * unlike the command-wide hotspot/priority rollup. */
export async function getIncidentMarkers(user: SessionUser): Promise<IncidentMarker[]> {
  const scopeJtfId = scopeJtfFilter(user);

  const incidents = await prisma.incident.findMany({
    where: { jtfId: scopeJtfId, lat: { not: null }, lng: { not: null } },
    include: { electionArea: true, jtf: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return incidents.map((incident) => ({
    id: incident.id,
    jtfId: incident.jtfId,
    jtfName: incident.jtf.name,
    electionAreaId: incident.electionAreaId,
    canModify: canModifyEntry(user, incident.jtfId, incident.createdById),
    type: incident.type,
    result: incident.result,
    date: incident.date.toISOString(),
    lat: incident.lat!,
    lng: incident.lng!,
    markerStyle: incident.markerStyle,
    source: incident.source,
    createdAt: incident.createdAt.toISOString(),
    areaLabel: incident.electionArea
      ? [incident.electionArea.barangay, incident.electionArea.municipality, incident.electionArea.province]
          .filter(Boolean)
          .join(", ")
      : null,
  }));
}

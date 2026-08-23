import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";

export interface IncidentMarker {
  id: string;
  jtfId: string;
  type: string;
  result: string | null;
  date: string;
  lat: number;
  lng: number;
  markerStyle: "NONE" | "BLINK" | "PULSE";
  areaLabel: string | null;
}

/** Individual incidents are row-level detail (SPEC.md §6 rollup note) —
 * strictly scoped to the caller's own JTF, same as the Incidents log and
 * unlike the command-wide hotspot/priority rollup. */
export async function getIncidentMarkers(user: SessionUser): Promise<IncidentMarker[]> {
  const scopeJtfId = scopeJtfFilter(user);

  const incidents = await prisma.incident.findMany({
    where: { jtfId: scopeJtfId, lat: { not: null }, lng: { not: null } },
    include: { electionArea: true },
    orderBy: { date: "desc" },
  });

  return incidents.map((incident) => ({
    id: incident.id,
    jtfId: incident.jtfId,
    type: incident.type,
    result: incident.result,
    date: incident.date.toISOString(),
    lat: incident.lat!,
    lng: incident.lng!,
    markerStyle: incident.markerStyle,
    areaLabel: incident.electionArea
      ? [incident.electionArea.barangay, incident.electionArea.municipality, incident.electionArea.province]
          .filter(Boolean)
          .join(", ")
      : null,
  }));
}

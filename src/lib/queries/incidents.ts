import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";

export interface IncidentFilters {
  jtfId?: string;
  electionAreaId?: string;
  type?: string;
  from?: string;
  to?: string;
}

export async function listIncidents(user: SessionUser, filters: IncidentFilters) {
  // Individual incident rows are row-level detail, not a rollup — stays
  // strictly scoped even for JTF_COMMANDER (SPEC.md §6).
  const scopeJtfId = scopeJtfFilter(user, filters.jtfId);

  return prisma.incident.findMany({
    where: {
      jtfId: scopeJtfId,
      electionAreaId: filters.electionAreaId || undefined,
      type: filters.type || undefined,
      date: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      },
    },
    include: { jtf: true, electionArea: true },
    orderBy: { date: "desc" },
    take: 200,
  });
}

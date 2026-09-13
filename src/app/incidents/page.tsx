import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listIncidents } from "@/lib/queries/incidents";
import { canWriteIncident, canModifyIncident } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncidentFormDialog } from "@/components/incident-form-dialog";
import { IncidentsAccordion, type IncidentRow } from "@/components/incidents-accordion";

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    jtfId?: string;
    electionAreaId?: string;
    type?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const filters = await searchParams;
  const [incidents, jtfs] = await Promise.all([
    listIncidents(user, filters),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
  ]);

  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));

  // A WFC_STAFF/MANEUVER ("M2") account isn't tied to one JTF but owns this
  // page command-wide, the same "any JTF" write posture ADMIN already has
  // here (see canWriteIncident) — mirrors bpe-deployment's isDeploymentOwner.
  const isIncidentOwner =
    user.role === "ADMIN" || (user.role === "WFC_STAFF" && user.warfightingFunction === "MANEUVER");
  const writableJtfId =
    isIncidentOwner
      ? undefined
      : user.jtfId && canWriteIncident(user, user.jtfId)
        ? user.jtfId
        : undefined;
  const canCreate = isIncidentOwner || (!!user.jtfId && canWriteIncident(user, user.jtfId));

  const incidentRows: IncidentRow[] = incidents.map((incident) => {
    const areaLabel =
      incident.locationLabel ||
      (incident.electionArea
        ? [incident.electionArea.barangay, incident.electionArea.municipality]
            .filter(Boolean)
            .join(", ") || incident.electionArea.province
        : "—");
    return {
      id: incident.id,
      date: incident.date,
      jtfName: incident.jtf.name,
      areaLabel,
      type: incident.type,
      result: incident.result,
      canEdit: canModifyIncident(user, incident.jtfId, incident.createdById),
      editInitial: {
        id: incident.id,
        jtfId: incident.jtfId,
        electionAreaId: incident.electionAreaId ?? undefined,
        locationLabel: incident.locationLabel ?? "",
        date: incident.date.toISOString().slice(0, 10),
        type: incident.type,
        result: incident.result ?? "",
        lat: incident.lat ?? undefined,
        lng: incident.lng ?? undefined,
      },
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Monitored Incidents</h1>
        </div>
        {canCreate && (
          <IncidentFormDialog
            jtfOptions={jtfOptions}
            lockJtfId={writableJtfId}
            trigger={<Button>Log Incident</Button>}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
            <div className="flex flex-col gap-1">
              <label htmlFor="jtfId" className="text-muted-foreground">
                JTF
              </label>
              <select
                id="jtfId"
                name="jtfId"
                defaultValue={filters.jtfId ?? ""}
                className="rounded border bg-background px-2 py-1.5"
              >
                <option value="">All</option>
                {jtfOptions.map((jtf) => (
                  <option key={jtf.id} value={jtf.id}>
                    {jtf.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="type" className="text-muted-foreground">
                Type
              </label>
              <input
                id="type"
                name="type"
                defaultValue={filters.type ?? ""}
                className="rounded border bg-background px-2 py-1.5"
                placeholder="e.g. ambush"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="from" className="text-muted-foreground">
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={filters.from ?? ""}
                className="rounded border bg-background px-2 py-1.5"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="to" className="text-muted-foreground">
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={filters.to ?? ""}
                className="rounded border bg-background px-2 py-1.5"
              />
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <IncidentsAccordion rows={incidentRows} jtfOptions={jtfOptions} />
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listIncidents } from "@/lib/queries/incidents";
import { canWriteJtf, canModifyEntry } from "@/lib/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { IncidentFormDialog } from "@/components/incident-form-dialog";
import { DeleteButton } from "@/components/delete-button";

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
  const [incidents, jtfs, areas] = await Promise.all([
    listIncidents(user, filters),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
    prisma.electionArea.findMany({
      select: { id: true, jtfId: true, barangay: true, municipality: true, province: true },
    }),
  ]);

  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));
  const areaOptions = areas.map((area) => ({
    id: area.id,
    jtfId: area.jtfId,
    label: [area.barangay, area.municipality, area.province].filter(Boolean).join(", "),
  }));

  const writableJtfId =
    user.role === "ADMIN" ? undefined : user.jtfId && canWriteJtf(user, user.jtfId) ? user.jtfId : undefined;
  const canCreate = user.role === "ADMIN" || (!!user.jtfId && canWriteJtf(user, user.jtfId));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Monitored Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Election-related incidents — the live log leadership should watch first.
          </p>
        </div>
        {canCreate && (
          <IncidentFormDialog
            jtfOptions={jtfOptions}
            areaOptions={areaOptions}
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
          <CardDescription>{incidents.length} shown (max 200).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>JTF</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => {
                const areaLabel = incident.electionArea
                  ? [incident.electionArea.barangay, incident.electionArea.municipality]
                      .filter(Boolean)
                      .join(", ") || incident.electionArea.province
                  : "—";
                const canModify = canModifyEntry(user, incident.jtfId, incident.createdById);
                return (
                  <TableRow key={incident.id}>
                    <TableCell>{incident.date.toLocaleDateString()}</TableCell>
                    <TableCell>{incident.jtf.name}</TableCell>
                    <TableCell>{areaLabel}</TableCell>
                    <TableCell>{incident.type}</TableCell>
                    <TableCell>{incident.result ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {canModify && (
                        <div className="flex justify-end gap-1">
                          <IncidentFormDialog
                            jtfOptions={jtfOptions}
                            areaOptions={areaOptions}
                            initial={{
                              id: incident.id,
                              jtfId: incident.jtfId,
                              electionAreaId: incident.electionAreaId ?? undefined,
                              date: incident.date.toISOString().slice(0, 10),
                              type: incident.type,
                              result: incident.result ?? "",
                            }}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            }
                          />
                          <DeleteButton
                            url={`/api/incidents/${incident.id}`}
                            confirmMessage="Delete this incident? This cannot be undone."
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {incidents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No incidents match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

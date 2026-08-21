import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listElectionOpsAreas } from "@/lib/queries/election-ops";
import { canWriteJtf } from "@/lib/rbac";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ElectionOpsStatusDialog } from "@/components/election-ops-status-dialog";

function pctLabel(pct: number | null): string {
  return pct === null ? "—" : `${pct.toFixed(0)}%`;
}

export default async function ElectionOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ jtfId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { jtfId } = await searchParams;
  const [areas, jtfs] = await Promise.all([
    listElectionOpsAreas(user, jtfId),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Election Ops Status</h1>
        <p className="text-sm text-muted-foreground">
          Paraphernalia delivery, ACM sealing, voting, transmission, and canvassing per
          area.
        </p>
      </div>

      <form className="flex items-center gap-2 text-sm" action="/election-ops" method="get">
        <label htmlFor="jtfId" className="text-muted-foreground">
          JTF:
        </label>
        <select
          id="jtfId"
          name="jtfId"
          defaultValue={jtfId ?? ""}
          className="rounded border bg-background px-2 py-1"
        >
          <option value="">All</option>
          {jtfs.map((jtf) => (
            <option key={jtf.id} value={jtf.id}>
              {jtf.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Areas</CardTitle>
          <CardDescription>{areas.length} area(s) in scope.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>JTF</TableHead>
                <TableHead className="text-right">Treasurer %</TableHead>
                <TableHead className="text-right">Precinct %</TableHead>
                <TableHead>ACM</TableHead>
                <TableHead>Voting</TableHead>
                <TableHead>Transmission</TableHead>
                <TableHead className="text-right">Municipal %</TableHead>
                <TableHead className="text-right">Provincial %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((area) => {
                const canEdit = canWriteJtf(user, area.jtfId);
                const s = area.status;
                return (
                  <TableRow key={area.id}>
                    <TableCell>{area.label}</TableCell>
                    <TableCell>{area.jtfName}</TableCell>
                    <TableCell className="text-right">
                      {pctLabel(s?.paraphTreasurerPct ?? null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {pctLabel(s?.paraphPrecinctPct ?? null)}
                    </TableCell>
                    <TableCell>
                      {s?.acmTestedSealed ? (
                        <Badge>Sealed</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {s?.votingClosed
                        ? "Closed"
                        : s?.votingStarted
                          ? "In progress"
                          : "Not started"}
                    </TableCell>
                    <TableCell>{s?.transmissionStatus ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {pctLabel(s?.municipalCanvassPct ?? null)}
                      {s?.municipalProclaimed ? " (Proclaimed)" : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {pctLabel(s?.provincialCanvassPct ?? null)}
                      {s?.provincialProclaimed ? " (Proclaimed)" : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <ElectionOpsStatusDialog
                          electionAreaId={area.id}
                          areaLabel={area.label}
                          initial={
                            s
                              ? {
                                  paraphTotalTreasurer: s.paraphTotalTreasurer,
                                  paraphDeliveredTreasurer: s.paraphDeliveredTreasurer,
                                  paraphTotalPrecinct: s.paraphTotalPrecinct,
                                  paraphDeliveredPrecinct: s.paraphDeliveredPrecinct,
                                  acmTestedSealed: s.acmTestedSealed,
                                  votingStarted: s.votingStarted,
                                  votingClosed: s.votingClosed,
                                  transmissionStatus: s.transmissionStatus,
                                  municipalCanvassPct: s.municipalCanvassPct,
                                  municipalProclaimed: s.municipalProclaimed,
                                  provincialCanvassPct: s.provincialCanvassPct,
                                  provincialProclaimed: s.provincialProclaimed,
                                }
                              : null
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {areas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No election areas in scope yet.
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

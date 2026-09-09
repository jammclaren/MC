import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getScoredAreas } from "@/lib/queries/priority-areas";
import { getIncidentMarkers } from "@/lib/queries/incident-markers";
import { getIntelMarkers } from "@/lib/queries/intel-markers";
import { canAccessPage, canWriteJtf } from "@/lib/rbac";
import { getBarangayIndex } from "@/lib/barangay-index";
import { PriorityMapLoader } from "@/components/priority-map-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ElectionAreaFormDialog } from "@/components/election-area-form-dialog";

const HOTSPOT_BADGE_VARIANT: Record<string, "critical" | "serious" | "warning" | "good"> = {
  Red: "critical",
  Orange: "serious",
  Yellow: "warning",
  Green: "good",
};

export default async function PriorityMapPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessPage(user, "situation-map")) {
    notFound();
  }

  const [areas, jtfs, markers, intelMarkers, electionAreas] = await Promise.all([
    getScoredAreas(user),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
    getIncidentMarkers(user),
    getIntelMarkers(user),
    prisma.electionArea.findMany({
      select: { id: true, jtfId: true, barangay: true, municipality: true, province: true },
    }),
  ]);
  const top10 = areas.slice(0, 10);
  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));
  const areaOptions = electionAreas.map((area) => ({
    id: area.id,
    jtfId: area.jtfId,
    label: [area.barangay, area.municipality, area.province].filter(Boolean).join(", "),
  }));
  const writableJtfId =
    user.role === "ADMIN"
      ? undefined
      : user.jtfId && canWriteJtf(user, user.jtfId)
        ? user.jtfId
        : undefined;
  const canCreate = user.role === "ADMIN" || (!!user.jtfId && canWriteJtf(user, user.jtfId));
  // Which JTFs' barangays are click-to-edit on the map's categorization
  // layer — ADMIN gets every JTF (jtfOptions is already the full roster),
  // a JTF-scoped writer gets just their own, everyone else gets none (the
  // layer stays read-only, same hover tooltip as before).
  const writableJtfIds = user.role === "ADMIN"
    ? jtfOptions.map((jtf) => jtf.id)
    : writableJtfId
      ? [writableJtfId]
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Situation Map</h1>
        </div>
        {canCreate && (
          <ElectionAreaFormDialog
            jtfOptions={jtfOptions}
            lockJtfId={writableJtfId}
            barangayIndex={getBarangayIndex()}
            trigger={<Button>Add Area</Button>}
          />
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <PriorityMapLoader
            areas={areas}
            markers={markers}
            intelMarkers={intelMarkers}
            jtfOptions={jtfOptions}
            areaOptions={areaOptions}
            lockJtfId={writableJtfId}
            canCreateMarker={canCreate}
            writableJtfIds={writableJtfIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority Areas (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>Hotspot</TableHead>
                <TableHead className="text-right">Registered Voters</TableHead>
                <TableHead className="text-right">Deployed</TableHead>
                <TableHead className="text-right">Recent Incidents (30d)</TableHead>
                <TableHead className="text-right">Priority Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top10.map((area) => {
                const label =
                  [area.barangay, area.municipality, area.province]
                    .filter(Boolean)
                    .join(", ") || area.province;
                return (
                  <TableRow key={area.id}>
                    <TableCell>{label}</TableCell>
                    <TableCell>
                      {area.hotspotCategory ? (
                        <Badge
                          variant={
                            HOTSPOT_BADGE_VARIANT[area.hotspotCategory] ?? "outline"
                          }
                        >
                          {area.hotspotCategory}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {area.registeredVoters?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {area.deployedToPolling.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {area.recentIncidentCount}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {area.priorityScore.toFixed(1)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {top10.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No election areas recorded yet.
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

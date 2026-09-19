import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIncidentMarkers } from "@/lib/queries/incident-markers";
import { getIntelMarkers } from "@/lib/queries/intel-markers";
import { canAccessPage, canWriteJtf } from "@/lib/rbac";
import { getBarangayIndex } from "@/lib/barangay-index";
import { PriorityMapLoader } from "@/components/priority-map-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ElectionAreaFormDialog } from "@/components/election-area-form-dialog";

export default async function PriorityMapPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessPage(user, "situation-map")) {
    notFound();
  }

  const [jtfs, markers, intelMarkers, electionAreas] = await Promise.all([
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
    getIncidentMarkers(user),
    getIntelMarkers(user),
    prisma.electionArea.findMany({
      select: { id: true, jtfId: true, barangay: true, municipality: true, province: true },
    }),
  ]);
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
            markers={markers}
            intelMarkers={intelMarkers}
            jtfOptions={jtfOptions}
            areaOptions={areaOptions}
            lockJtfId={writableJtfId}
            canCreateMarker={canCreate}
          />
        </CardContent>
      </Card>
    </div>
  );
}

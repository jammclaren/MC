import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listElectionOpsAreas } from "@/lib/queries/election-ops";
import { canWriteJtf } from "@/lib/rbac";
import { getBarangayIndex } from "@/lib/barangay-index";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ElectionAreasAccordion } from "@/components/election-areas-accordion";

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
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Election Status</h1>
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
          <CardDescription>
            {areas.length} area(s) in scope. Click a municipality to show its barangays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ElectionAreasAccordion
            areas={areas.map((area) => ({ ...area, canEdit: canWriteJtf(user, area.jtfId) }))}
            jtfOptions={jtfs.map((j) => ({ id: j.id, name: j.name }))}
            barangayIndex={getBarangayIndex()}
          />
        </CardContent>
      </Card>
    </div>
  );
}

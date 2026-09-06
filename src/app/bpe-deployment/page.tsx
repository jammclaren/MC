import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDeploymentData } from "@/lib/queries/deployments";
import { safePercent } from "@/lib/percentages";
import { canAccessPage, canWriteJtf } from "@/lib/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { Users, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeploymentFormDialog } from "@/components/deployment-form-dialog";
import { DeploymentRowsAccordion } from "@/components/deployment-rows-accordion";

export default async function BpeDeploymentPage({
  searchParams,
}: {
  searchParams: Promise<{ jtfId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessPage(user, "deployment")) {
    notFound();
  }

  const { jtfId } = await searchParams;
  const [data, jtfs, areas] = await Promise.all([
    getDeploymentData(user, jtfId),
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
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            Deployment
          </h1>
          <p className="text-sm text-muted-foreground">
            BARMM Parliamentary Election security operations, 30 Jul–14 Sep 2026.
          </p>
        </div>
        {canCreate && (
          <DeploymentFormDialog
            jtfOptions={jtfOptions}
            areaOptions={areaOptions}
            lockJtfId={writableJtfId}
            trigger={<Button>Log Deployment</Button>}
          />
        )}
      </div>

      <form className="flex items-center gap-2 text-sm" action="/bpe-deployment" method="get">
        <label htmlFor="jtfId" className="text-muted-foreground">
          JTF:
        </label>
        <select
          id="jtfId"
          name="jtfId"
          defaultValue={jtfId ?? ""}
          className="rounded border bg-background px-2 py-1"
        >
          <option value="">All (rollup)</option>
          {jtfs.map((jtf) => (
            <option key={jtf.id} value={jtf.id}>
              {jtf.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded border px-3 py-1.5 hover:bg-muted">
          Filter
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.jtfCards.map((card) => {
          const coveragePct = safePercent(card.deployedToPolling, card.registeredVoters);
          return (
            <Card key={card.jtfId}>
              <CardHeader>
                <CardTitle className="text-base">{card.jtfName}</CardTitle>
                <CardDescription>
                  {card.numPrecincts.toLocaleString()} precincts ·{" "}
                  {card.registeredVoters.toLocaleString()} registered voters
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deployed to Polling</span>
                  <span className="font-medium">
                    {card.deployedToPolling.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QRF</span>
                  <span className="font-medium">{card.qrf.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PNP Deployed</span>
                  <span className="font-medium">{card.pnpDeployed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WAVs/TAV</span>
                  <span className="font-medium">{card.wavsTav.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voter Coverage</span>
                  <span className="font-medium">
                    {coveragePct === null ? "—" : `${coveragePct.toFixed(1)}%`}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {data.jtfCards.length === 0 && (
          <p className="text-sm text-muted-foreground">No JTFs in scope.</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Recapitulation — command-wide, auto-computed from unit reports
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <StatTile
            label="Deployed to Polling"
            value={data.totalDeployed.toLocaleString()}
            icon={Users}
          />
          <StatTile label="QRF" value={data.totalQrf.toLocaleString()} icon={ShieldAlert} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit-Level Breakdown</CardTitle>
          <CardDescription>
            Most recently reported first. Click a JTF to show its units.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeploymentRowsAccordion
            rows={data.rows.map((row) => ({ ...row, canEdit: canWriteJtf(user, row.jtfId) }))}
            jtfOptions={jtfOptions}
            areaOptions={areaOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}

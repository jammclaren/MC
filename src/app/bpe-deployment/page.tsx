import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSitRepData } from "@/lib/queries/sitreps";
import { listComponentSitReps } from "@/lib/queries/component-sitreps";
import { canAccessPage, canWriteComponentSitRep, canWriteDeployment } from "@/lib/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { criticalAssetsStatus } from "@/lib/critical-assets-status";
import { Users, Crosshair, ShieldAlert, Truck, Shield, Rocket, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SitRepFormDialog } from "@/components/sitrep-form-dialog";
import { SitRepAccordion } from "@/components/sitrep-accordion";
import { UnitBreakdownAccordion } from "@/components/unit-breakdown-accordion";
import { SitRepBarChart } from "@/components/charts/sitrep-bar-chart";
import { ComponentSitRepFormDialog } from "@/components/component-sitrep-form-dialog";
import { ComponentSitRepLog } from "@/components/component-sitrep-log";
import { NavCollapseToggle } from "@/components/nav-collapse-toggle";

export default async function DailySitRepPage({
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

  // COMPONENT_COMMAND accounts aren't JTF-scoped at all — they log their
  // own Air/Naval SITREP here instead of the JTF Task Group one below.
  if (user.role === "COMPONENT_COMMAND") {
    const rows = await listComponentSitReps(user);
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
              Daily SITREP
            </h1>
            <NavCollapseToggle />
          </div>
          {canWriteComponentSitRep(user) && (
            <ComponentSitRepFormDialog
              component={user.component!}
              trigger={<Button>Log SITREP</Button>}
            />
          )}
        </div>

        {!user.component && (
          <p className="text-sm text-muted-foreground">
            This account has no component (Air or Naval) assigned — contact an administrator.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>SITREP Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ComponentSitRepLog rows={rows} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const { jtfId } = await searchParams;
  // A WFC_STAFF/MANEUVER ("M2") account isn't tied to one JTF but owns this
  // page command-wide, the same "any JTF" write posture ADMIN already has
  // here (see canWriteDeployment).
  const isSitRepOwner =
    user.role === "ADMIN" || (user.role === "WFC_STAFF" && user.warfightingFunction === "MANEUVER");
  const writableJtfId =
    isSitRepOwner
      ? undefined
      : user.jtfId && canWriteDeployment(user, user.jtfId)
        ? user.jtfId
        : undefined;
  const canCreate = isSitRepOwner || (!!user.jtfId && canWriteDeployment(user, user.jtfId));

  const [data, jtfs] = await Promise.all([
    getSitRepData(user, jtfId, (targetJtfId) => canWriteDeployment(user, targetJtfId)),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
  ]);
  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));
  const criticalStatus = criticalAssetsStatus(data);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            Daily SITREP
          </h1>
          <NavCollapseToggle />
        </div>
        {canCreate && (
          <SitRepFormDialog
            jtfOptions={jtfOptions}
            lockJtfId={writableJtfId}
            trigger={<Button>Log SITREP</Button>}
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
        {data.jtfCards.map((card) => (
          <Card key={card.jtfId}>
            <CardHeader>
              <CardTitle className="text-base">{card.jtfName}</CardTitle>
              <CardDescription>
                {card.taskGroupCount} task group{card.taskGroupCount === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Strength</span>
                <span className="font-medium">{card.totalStrength.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Critical Assets</span>
                <span className="font-medium">{card.criticalAssetCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Checkpoint Operations</span>
                <span className="font-medium">{card.checkpointOpsTotal.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.jtfCards.length === 0 && (
          <p className="text-sm text-muted-foreground">No JTFs in scope.</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Recapitulation — command-wide, auto-computed from SITREP log
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Total Strength" value={data.totalStrength.toLocaleString()} icon={Users} />
          <StatTile
            label="Status of Critical Assets"
            value={<span className="text-lg leading-tight">{criticalStatus.value}</span>}
            icon={ShieldAlert}
            tone={criticalStatus.tone}
          />
          <StatTile
            label="Checkpoint Operations"
            value={data.totalCheckpointOps.toLocaleString()}
            icon={Crosshair}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Number of WAVs" value={data.totalWav.toLocaleString()} icon={Truck} />
          <StatTile label="Number of TAVs" value={data.totalTav.toLocaleString()} icon={Shield} />
          <StatTile
            label="Number of Artillery Assets"
            value={data.totalArtillery.toLocaleString()}
            icon={Rocket}
          />
          <StatTile label="Number of Naval Assets" value={data.totalNaval.toLocaleString()} icon={Ship} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SITREP Recapitulation</CardTitle>
        </CardHeader>
        <CardContent>
          <SitRepBarChart
            data={data.jtfCards.map((c) => ({
              jtfName: c.jtfName,
              totalStrength: c.totalStrength,
              criticalAssetCount: c.criticalAssetCount,
              checkpointOpsTotal: c.checkpointOpsTotal,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unit Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitBreakdownAccordion rows={data.unitBreakdown} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SITREP Log</CardTitle>
        </CardHeader>
        <CardContent>
          <SitRepAccordion rows={data.rows} />
        </CardContent>
      </Card>
    </div>
  );
}

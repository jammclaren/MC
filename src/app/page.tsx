import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getOverviewData } from "@/lib/queries/overview";
import { getIncidentMarkers } from "@/lib/queries/incident-markers";
import { nowMs } from "@/lib/time";
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
import { DeploymentBarChart } from "@/components/charts/deployment-bar-chart";
import { StatTile } from "@/components/stat-tile";
import { FunnelPanel } from "@/components/funnel-panel";
import { DailyAssessmentPanel } from "@/components/daily-assessment-panel";
import { OverviewIncidentOpsPanel } from "@/components/overview-incident-ops-panel";
import { FitToViewport } from "@/components/fit-to-viewport";
import { Users, ShieldAlert, TriangleAlert, Crosshair, Vote } from "lucide-react";

export default async function OverviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const [data, incidentMarkers] = await Promise.all([
    getOverviewData(user),
    getIncidentMarkers(user),
  ]);
  const now = nowMs();

  return (
    <FitToViewport>
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold tracking-wide uppercase">Command Overview</h1>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            size="sm"
            label="Registered Voters (BARMM)"
            value={data.totalRegisteredVoters.toLocaleString()}
            icon={Vote}
          />
          <StatTile
            size="sm"
            label="Deployed to Polling"
            value={data.totalDeployed.toLocaleString()}
            icon={Users}
          />
          <StatTile size="sm" label="QRF" value={data.totalQrf.toLocaleString()} icon={ShieldAlert} />
          <StatTile
            size="sm"
            label="Incidents (30d)"
            value={data.recentIncidentCount30d.toLocaleString()}
            icon={TriangleAlert}
            tone={data.recentIncidentCount30d > 0 ? "warning" : "default"}
          />
          <StatTile
            size="sm"
            label="Priority Areas"
            value={data.priorityAreaCount.toLocaleString()}
            icon={Crosshair}
            tone={data.priorityAreaCount > 0 ? "critical" : "good"}
            hint="score ≥ Red-hotspot baseline"
          />
        </div>

        <OverviewIncidentOpsPanel
          markers={incidentMarkers}
          topPriorityAreas={data.topPriorityAreas}
          incidentsByDay={data.incidentsByDay}
          now={now}
        />

        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Status of Election Operations</CardTitle>
                <CardDescription>Areas progressing through the BPE pipeline.</CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelPanel stages={data.electionOpsFunnel} compact />
              </CardContent>
            </Card>
            <DailyAssessmentPanel />
          </div>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Troop Deployment Recapitulation</CardTitle>
              <CardDescription>
                {data.totalDeployed.toLocaleString()} deployed to polling ·{" "}
                {data.totalQrf.toLocaleString()} QRF
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DeploymentBarChart data={data.jtfDeployments} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 py-1">JTF</TableHead>
                    <TableHead className="h-8 py-1 text-right">Deployed to Polling</TableHead>
                    <TableHead className="h-8 py-1 text-right">QRF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.jtfDeployments.map((row) => (
                    <TableRow key={row.jtfId}>
                      <TableCell className="py-1">{row.jtfName}</TableCell>
                      <TableCell className="py-1 text-right">
                        {row.deployedToPolling.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-1 text-right">{row.qrf.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {data.jtfDeployments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-1 text-center text-muted-foreground">
                        No deployment data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </FitToViewport>
  );
}

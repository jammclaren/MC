import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getOverviewData } from "@/lib/queries/overview";
import { getIncidentMarkers } from "@/lib/queries/incident-markers";
import { listJtfAssessments } from "@/lib/queries/jtf-assessments";
import { canAccessPage, canWriteJtf } from "@/lib/rbac";
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
import { JtfAssessmentCard } from "@/components/jtf-assessment-card";
import { OverviewIncidentOpsPanel } from "@/components/overview-incident-ops-panel";
import { Users, ShieldAlert, TriangleAlert, Crosshair, Vote, Plane, Ship } from "lucide-react";

export default async function OverviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const [data, incidentMarkers, jtfAssessments] = await Promise.all([
    getOverviewData(user),
    getIncidentMarkers(user),
    listJtfAssessments(user),
  ]);
  const now = nowMs();
  const canSubmitAssessment = !!user.jtfId && canWriteJtf(user, user.jtfId);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatTile
          label="Registered Voters (BARMM)"
          value={data.totalRegisteredVoters.toLocaleString()}
          icon={Vote}
        />
        <StatTile
          label="Deployed to Polling Precincts"
          value={data.totalDeployed.toLocaleString()}
          icon={Users}
        />
        <StatTile label="QRF" value={data.totalQrf.toLocaleString()} icon={ShieldAlert} />
        <StatTile
          label="Total Air Assets Deployed"
          value={data.totalAirAssets.toLocaleString()}
          icon={Plane}
        />
        <StatTile
          label="Total Naval Assets Deployed"
          value={data.totalNavalAssets.toLocaleString()}
          icon={Ship}
        />
        <StatTile
          label="Incidents (30d)"
          value={data.recentIncidentCount30d.toLocaleString()}
          icon={TriangleAlert}
          tone={data.recentIncidentCount30d > 0 ? "warning" : "default"}
        />
        <StatTile
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
        canAccessSituationMap={canAccessPage(user, "situation-map")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status of Election Operations</CardTitle>
            <CardDescription>Areas progressing through the BPE pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelPanel stages={data.electionOpsFunnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troop Deployment Recapitulation</CardTitle>
            <CardDescription>
              {data.totalDeployed.toLocaleString()} deployed to polling precincts ·{" "}
              {data.totalQrf.toLocaleString()} QRF
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <DeploymentBarChart data={data.jtfDeployments} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>JTF</TableHead>
                  <TableHead className="text-right">Deployed to Polling Precincts</TableHead>
                  <TableHead className="text-right">QRF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.jtfDeployments.map((row) => (
                  <TableRow key={row.jtfId}>
                    <TableCell>{row.jtfName}</TableCell>
                    <TableCell className="text-right">
                      {row.deployedToPolling.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{row.qrf.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {data.jtfDeployments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No deployment data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <JtfAssessmentCard assessments={jtfAssessments} canSubmit={canSubmitAssessment} />

      <DailyAssessmentPanel />
    </div>
  );
}

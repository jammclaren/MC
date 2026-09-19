import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getOverviewData } from "@/lib/queries/overview";
import { getIncidentMarkers } from "@/lib/queries/incident-markers";
import { listJtfAssessments } from "@/lib/queries/jtf-assessments";
import { canAccessPage, canWriteJtf } from "@/lib/rbac";
import { nowMs } from "@/lib/time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SitRepCapsuleChart } from "@/components/charts/sitrep-capsule-chart";
import { StatTile } from "@/components/stat-tile";
import { DailyAssessmentPanel } from "@/components/daily-assessment-panel";
import { JtfAssessmentCard } from "@/components/jtf-assessment-card";
import { OverviewIncidentOpsPanel } from "@/components/overview-incident-ops-panel";
import { Users, ShieldAlert, TriangleAlert, Crosshair } from "lucide-react";

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total Strength" value={data.totalStrength.toLocaleString()} icon={Users} />
        <StatTile
          label="Critical Assets"
          value={data.totalCriticalAssets.toLocaleString()}
          icon={ShieldAlert}
        />
        <StatTile
          label="Checkpoint Operations"
          value={data.totalCheckpointOps.toLocaleString()}
          icon={Crosshair}
        />
        <StatTile
          label="Incidents (30d)"
          value={data.recentIncidentCount30d.toLocaleString()}
          icon={TriangleAlert}
          tone={data.recentIncidentCount30d > 0 ? "warning" : "default"}
        />
      </div>

      <OverviewIncidentOpsPanel
        markers={incidentMarkers}
        incidentsByDay={data.incidentsByDay}
        now={now}
        canAccessSituationMap={canAccessPage(user, "situation-map")}
      />

      <Card>
        <CardHeader>
          <CardTitle>DISPOLOC</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SitRepCapsuleChart
            data={data.jtfSitReps.map((row) => ({
              jtfName: row.jtfName,
              totalStrength: row.totalStrength,
              criticalAssetCount: row.criticalAssetCount,
              checkpointOpsTotal: row.checkpointOpsTotal,
            }))}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>JTF</TableHead>
                <TableHead className="text-right">Total Strength</TableHead>
                <TableHead className="text-right">Critical Assets</TableHead>
                <TableHead className="text-right">Checkpoint Ops</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.jtfSitReps.map((row) => (
                <TableRow key={row.jtfId}>
                  <TableCell>{row.jtfName}</TableCell>
                  <TableCell className="text-right">{row.totalStrength.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {row.criticalAssetCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.checkpointOpsTotal.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {data.jtfSitReps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No SITREP data yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <JtfAssessmentCard assessments={jtfAssessments} canSubmit={canSubmitAssessment} />

      <DailyAssessmentPanel />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getOverviewData } from "@/lib/queries/overview";
import { safePercent } from "@/lib/percentages";
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
import { DeploymentBarChart } from "@/components/charts/deployment-bar-chart";
import { IncidentsByDayChart } from "@/components/charts/incidents-by-day-chart";
import { StatTile } from "@/components/stat-tile";
import { GaugeMeter } from "@/components/gauge-meter";
import { FunnelPanel } from "@/components/funnel-panel";
import { PriorityLeaderboard } from "@/components/priority-leaderboard";
import { Users, ShieldAlert, TriangleAlert, Crosshair, CalendarClock } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  CTG: "CTG (Communist Terrorist Group)",
  LTG: "LTG (Local Terrorist Groups)",
  CBC: "CBC (Community-Based Conflict / RIDO)",
};

function formatPct(pct: number | null): string {
  return pct === null ? "—" : `${pct.toFixed(0)}%`;
}

export default async function OverviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const data = await getOverviewData(user);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Command Overview</h1>
        <p className="text-sm text-muted-foreground">
          Recapitulation of troop deployment and threat-category accomplishments.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Deployed to Polling"
          value={data.totalDeployed.toLocaleString()}
          icon={Users}
        />
        <StatTile label="QRF" value={data.totalQrf.toLocaleString()} icon={ShieldAlert} />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>BPE 2026 Window</CardTitle>
            <CardDescription>
              {data.bpe.startDate} – {data.bpe.endDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {data.bpe.daysRemaining === null ? (
              <div className="text-center">
                <div className="font-mono text-3xl font-semibold text-muted-foreground">
                  Concluded
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Election window has closed
                </div>
              </div>
            ) : (
              <div
                className={
                  "flex items-center gap-2 rounded-md px-4 py-2 " +
                  (data.bpe.daysRemaining <= 7
                    ? "bg-status-critical/15 text-status-critical"
                    : data.bpe.daysRemaining <= 14
                      ? "bg-status-warning/15 text-status-warning"
                      : "bg-muted text-foreground")
                }
              >
                <CalendarClock className="size-5" />
                <div>
                  <div className="font-mono text-2xl font-bold tabular-nums">
                    {data.bpe.daysRemaining}
                  </div>
                  <div className="text-xs uppercase tracking-wide">
                    days {data.bpe.hasStarted ? "remaining" : "until start"}
                  </div>
                </div>
              </div>
            )}
            <GaugeMeter
              value={safePercent(data.totalDeployed, data.totalRegisteredVoters) ?? 0}
              label="Voter Coverage"
              caption={`${data.totalDeployed.toLocaleString()} / ${data.totalRegisteredVoters.toLocaleString()} voters`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Election Ops Funnel</CardTitle>
            <CardDescription>Areas progressing through the BPE pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelPanel stages={data.electionOpsFunnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents (14d)</CardTitle>
            <CardDescription>Daily count, most recent on the right.</CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentsByDayChart data={data.incidentsByDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Leaderboard</CardTitle>
            <CardDescription>Top areas by computed priority score.</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityLeaderboard entries={data.topPriorityAreas} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Troop Deployment Recapitulation</CardTitle>
          <CardDescription>
            {data.totalDeployed.toLocaleString()} deployed to polling ·{" "}
            {data.totalQrf.toLocaleString()} QRF
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <DeploymentBarChart data={data.jtfDeployments} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>JTF</TableHead>
                <TableHead className="text-right">Deployed to Polling</TableHead>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.categorySummaries.map((summary) => {
          const pct = safePercent(summary.actual, summary.targetYE);
          return (
            <Card key={summary.category}>
              <CardHeader>
                <CardTitle className="text-base">
                  {CATEGORY_LABELS[summary.category]}
                </CardTitle>
                <CardDescription>Year-end target vs. actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold tabular-nums text-primary">
                    {summary.actual}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    / {summary.targetYE || "—"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatPct(pct)} of year-end target
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>Last 10 reported, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>JTF</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>{incident.date.toLocaleDateString()}</TableCell>
                  <TableCell>{incident.jtfName}</TableCell>
                  <TableCell>{incident.areaLabel ?? "—"}</TableCell>
                  <TableCell>{incident.type}</TableCell>
                  <TableCell>{incident.result ?? "—"}</TableCell>
                  <TableCell>
                    {incident.isPriority && <Badge variant="critical">Priority</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {data.recentIncidents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No incidents reported yet.
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

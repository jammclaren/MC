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
        <h1 className="text-2xl font-semibold tracking-tight">Command Overview</h1>
        <p className="text-sm text-muted-foreground">
          Recapitulation of troop deployment and threat-category accomplishments.
        </p>
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
                  <span className="text-3xl font-semibold">{summary.actual}</span>
                  <span className="text-sm text-muted-foreground">
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
                    {incident.isPriority && <Badge variant="destructive">Priority</Badge>}
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

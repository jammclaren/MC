import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessIntelligenceUpdate, canWriteIntelligenceUpdate } from "@/lib/rbac";
import { listIntelUpdates } from "@/lib/queries/intel-updates";
import { computeIntelAssessment } from "@/lib/intel-assessment";
import { PROVINCE_TO_JTF } from "@/lib/queries/election-board";
import { nowMs } from "@/lib/time";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/stat-tile";
import { LabeledBarChart } from "@/components/charts/labeled-bar-chart";
import { SeverityMixChart } from "@/components/charts/severity-mix-chart";
import { IntelUpdateFormDialog } from "@/components/intel-update-form-dialog";
import { IntelUpdatesPanel } from "@/components/intel-updates-panel";
import { FileWarning, ShieldAlert, Radar, CalendarClock } from "lucide-react";

function topCounts(values: (string | null)[], limit: number): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const label = v?.trim() || "Unspecified";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export default async function IntelUpdatePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessIntelligenceUpdate(user)) {
    notFound();
  }

  const rows = await listIntelUpdates(user);
  const canWrite = canWriteIntelligenceUpdate(user);
  const provinceOptions = Object.keys(PROVINCE_TO_JTF);
  const assessment = computeIntelAssessment(rows);

  const violent = rows.filter((r) => r.category === "VIOLENT");
  const nonViolent = rows.filter((r) => r.category === "NON_VIOLENT");
  const since30d = nowMs() - 30 * 24 * 60 * 60 * 1000;
  const recent30d = rows.filter((r) => new Date(r.date).getTime() >= since30d);

  const byProvince = topCounts(
    rows.map((r) => r.province),
    7
  );
  const byThreatGroup = topCounts(
    rows.map((r) => r.threatGroup),
    7
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            Intelligence Update
          </h1>
          <p className="text-sm text-muted-foreground">
            Threat activity reports — non-violent and violent, grid-referenced by MGRS.
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <IntelUpdateFormDialog
              category="NON_VIOLENT"
              provinceOptions={provinceOptions}
              trigger={<Button variant="outline">Log Non-Violent Activity</Button>}
            />
            <IntelUpdateFormDialog
              category="VIOLENT"
              provinceOptions={provinceOptions}
              trigger={<Button variant="destructive">Log Violent Activity</Button>}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total Reports" value={rows.length.toLocaleString()} icon={Radar} />
        <StatTile
          label="Violent"
          value={violent.length.toLocaleString()}
          icon={ShieldAlert}
          tone={violent.length > 0 ? "critical" : "good"}
        />
        <StatTile
          label="Non-Violent"
          value={nonViolent.length.toLocaleString()}
          icon={FileWarning}
          tone={nonViolent.length > 0 ? "warning" : "default"}
        />
        <StatTile
          label="Reports (30d)"
          value={recent30d.length.toLocaleString()}
          icon={CalendarClock}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Violent vs Non-Violent</CardTitle>
            <CardDescription>Category mix across all reports on file.</CardDescription>
          </CardHeader>
          <CardContent>
            <SeverityMixChart
              total={rows.length}
              segments={[
                { label: "Violent", count: violent.length, color: "var(--status-critical)" },
                { label: "Non-Violent", count: nonViolent.length, color: "var(--status-warning)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports by Province</CardTitle>
            <CardDescription>Where activity is being reported.</CardDescription>
          </CardHeader>
          <CardContent>
            <LabeledBarChart data={byProvince} color="var(--chart-2)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Threat Groups</CardTitle>
            <CardDescription>Most-cited groups across reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <LabeledBarChart data={byThreatGroup} color="var(--chart-3)" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Log</CardTitle>
          <CardDescription>Search across all fields, grouped by province.</CardDescription>
        </CardHeader>
        <CardContent>
          <IntelUpdatesPanel rows={rows} provinceOptions={provinceOptions} canWrite={canWrite} />
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Overall Analysis &amp; Assessment</CardTitle>
          <CardDescription>Auto-generated from on-file reports — recomputed on load.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {assessment.analysis.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccessIntelligenceUpdate, canWriteIntelligenceUpdate } from "@/lib/rbac";
import { listIntelUpdates } from "@/lib/queries/intel-updates";
import { listIntelOverallAssessments } from "@/lib/queries/intel-overall-assessment";
import { listIntelMeeAssets } from "@/lib/queries/intel-mee";
import { computeIntelAssessment } from "@/lib/intel-assessment";
import { PROVINCE_TO_JTF } from "@/lib/queries/election-board";
import { nowMs } from "@/lib/time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/stat-tile";
import { LabeledBarChart } from "@/components/charts/labeled-bar-chart";
import { SeverityMixChart } from "@/components/charts/severity-mix-chart";
import {
  TopIncidentTypesChart,
  type TopIncidentTypeDatum,
} from "@/components/charts/top-incident-types-chart";
import { ActivityTrendChart, type ActivityTrendDatum } from "@/components/charts/activity-trend-chart";
import { IntelUpdateFormDialog } from "@/components/intel-update-form-dialog";
import { IntelOverallAssessmentFormDialog } from "@/components/intel-overall-assessment-form-dialog";
import { IntelOverallAssessmentList } from "@/components/intel-overall-assessment-list";
import { IntelUpdatesPanel } from "@/components/intel-updates-panel";
import { IntelMeeFormDialog } from "@/components/intel-mee-form-dialog";
import { IntelMeeCards } from "@/components/intel-mee-cards";
import type { IntelUpdateRow } from "@/lib/queries/intel-updates";
import { truncateLabel } from "@/lib/text";
import { FileWarning, ShieldAlert, Radar, CalendarClock } from "lucide-react";

const ACTIVITY_TREND_WINDOW_DAYS = 14;

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


/** Shortens each label for the Top Activities charts specifically — a
 * manually-typed Type of Activity isn't guaranteed to stay short, and a
 * long one makes the ranked list look cluttered. Full text stays on hover
 * via `fullLabel`. */
function withShortLabels(items: { label: string; count: number }[]): TopIncidentTypeDatum[] {
  return items.map((i) => ({ label: truncateLabel(i.label), count: i.count, fullLabel: i.label }));
}

/** Daily count per activity label over the trailing window — feeds
 * ActivityTrendChart. `nowIso` is passed in (rather than read here) so this
 * plain helper stays free of its own Date.now()/new Date() call, keeping
 * the impurity confined to the one nowMs() call in the page component. */
function buildActivityTrend(
  rows: IntelUpdateRow[],
  labels: string[],
  days: number,
  nowIso: string
): ActivityTrendDatum[] {
  const map = new Map<string, ActivityTrendDatum>();
  const today = new Date(nowIso);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry: ActivityTrendDatum = { date: key };
    for (const label of labels) entry[label] = 0;
    map.set(key, entry);
  }
  for (const row of rows) {
    const label = row.activityType?.trim();
    if (!label || !labels.includes(label)) continue;
    const key = row.date.slice(0, 10);
    const entry = map.get(key);
    if (entry) entry[label] = (entry[label] as number) + 1;
  }
  return Array.from(map.values());
}

export default async function IntelUpdatePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessIntelligenceUpdate(user)) {
    notFound();
  }

  const [rows, overallAssessments, meeAssets, jtfs] = await Promise.all([
    listIntelUpdates(user),
    listIntelOverallAssessments(user),
    listIntelMeeAssets(user),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
  ]);
  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));
  const canWrite = canWriteIntelligenceUpdate(user);
  const provinceOptions = Object.keys(PROVINCE_TO_JTF);
  const assessment = computeIntelAssessment(rows);

  const violent = rows.filter((r) => r.category === "VIOLENT");
  const nonViolent = rows.filter((r) => r.category === "NON_VIOLENT");
  const nowIso = new Date(nowMs()).toISOString();
  const since30d = nowMs() - 30 * 24 * 60 * 60 * 1000;
  const recent30d = rows.filter((r) => new Date(r.date).getTime() >= since30d);
  const since24h = nowMs() - 24 * 60 * 60 * 1000;
  const recent24h = rows.filter((r) => new Date(r.createdAt).getTime() >= since24h);

  // Only these two get shortened — the rest of the tracked provinces
  // (Basilan, Tawi-Tawi, SGA-BARMM) are already short enough for the
  // chart's axis labels.
  const PROVINCE_CHART_ABBREVIATIONS: Record<string, string> = {
    "Maguindanao del Sur": "MDS",
    "Maguindanao del Norte": "MDN",
    "Cotabato City": "Cot City",
    "Lanao del Sur": "LDS",
  };
  const byProvince = topCounts(
    rows.map((r) => r.province),
    7
  ).map((p) => ({ ...p, label: PROVINCE_CHART_ABBREVIATIONS[p.label] ?? p.label }));
  // Blank/null entries are excluded here — named-group breakdown only,
  // each activity stays under its own actual threat group/party rather
  // than mixed together with an "Unspecified" bucket.
  const byThreatGroup = topCounts(
    rows.map((r) => r.threatGroup).filter((v): v is string => !!v?.trim()),
    7
  );
  const byPoliticalParty = topCounts(
    rows.map((r) => r.politicalParty).filter((v): v is string => !!v?.trim()),
    7
  );
  const topNonViolentActivities = topCounts(
    nonViolent.map((r) => r.activityType),
    5
  );
  const topViolentActivities = topCounts(
    violent.map((r) => r.activityType),
    5
  );
  const nonViolentActivityLabels = topNonViolentActivities.map((a) => a.label);
  const violentActivityLabels = topViolentActivities.map((a) => a.label);
  const nonViolentActivityTrend = buildActivityTrend(
    nonViolent,
    nonViolentActivityLabels,
    ACTIVITY_TREND_WINDOW_DAYS,
    nowIso
  );
  const violentActivityTrend = buildActivityTrend(
    violent,
    violentActivityLabels,
    ACTIVITY_TREND_WINDOW_DAYS,
    nowIso
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            Intelligence Update
          </h1>
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

      <Card>
        <CardHeader>
          <CardTitle>Report Log</CardTitle>
        </CardHeader>
        <CardContent>
          <IntelUpdatesPanel rows={rows} provinceOptions={provinceOptions} canWrite={canWrite} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Violent vs Non-Violent</CardTitle>
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

        <div className="grid grid-cols-2 gap-4">
          <StatTile
            label="Total Reports for the Day (past 24 hrs)"
            value={recent24h.length.toLocaleString()}
            icon={Radar}
          />
          <StatTile
            label="Reports (30d)"
            value={recent30d.length.toLocaleString()}
            icon={CalendarClock}
          />
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>BY PROVINCE</CardTitle>
          </CardHeader>
          <CardContent>
            <LabeledBarChart data={byProvince} color="var(--chart-2)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>BY THREAT GROUP</CardTitle>
          </CardHeader>
          <CardContent>
            <LabeledBarChart data={byThreatGroup} color="var(--chart-3)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>BY POLITICAL PARTY</CardTitle>
          </CardHeader>
          <CardContent>
            <LabeledBarChart data={byPoliticalParty} color="var(--chart-4)" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Non-Violent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <TopIncidentTypesChart data={withShortLabels(topNonViolentActivities)} total={nonViolent.length} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Violent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <TopIncidentTypesChart data={withShortLabels(topViolentActivities)} total={violent.length} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Non-Violent Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTrendChart data={nonViolentActivityTrend} activityLabels={nonViolentActivityLabels} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Violent Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTrendChart data={violentActivityTrend} activityLabels={violentActivityLabels} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Intel Mission Essential Equipment (MEE)</CardTitle>
            </div>
            {canWrite && (
              <IntelMeeFormDialog
                jtfOptions={jtfOptions}
                trigger={<Button variant="outline">Log Equipment</Button>}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <IntelMeeCards rows={meeAssets} jtfOptions={jtfOptions} canWrite={canWrite} />
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Overall Analysis &amp; Assessment</CardTitle>
            </div>
            {canWrite && (
              <IntelOverallAssessmentFormDialog
                trigger={<Button variant="outline">Manual Entry</Button>}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2 text-sm">
            {assessment.analysis.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <IntelOverallAssessmentList assessments={overallAssessments} canWrite={canWrite} />
        </CardContent>
      </Card>
    </div>
  );
}

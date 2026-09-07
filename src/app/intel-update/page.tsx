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
import {
  TopIncidentTypesChart,
  type TopIncidentTypeDatum,
} from "@/components/charts/top-incident-types-chart";
import { ActivityTrendChart, type ActivityTrendDatum } from "@/components/charts/activity-trend-chart";
import { IntelUpdateFormDialog } from "@/components/intel-update-form-dialog";
import { IntelUpdatesPanel } from "@/components/intel-updates-panel";
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

/** How many distinct days (out of the trend window) each activity label was
 * reported on at all — "persistence" rather than raw volume, so an activity
 * reported once a day for two weeks ranks above one reported ten times in a
 * single day, surfacing the one that keeps recurring rather than the one
 * with the single biggest spike. */
function daysActive(
  trend: ActivityTrendDatum[],
  labels: string[]
): { label: string; count: number }[] {
  return labels
    .map((label) => ({
      label,
      count: trend.filter((d) => (d[label] as number) > 0).length,
    }))
    .sort((a, b) => b.count - a.count);
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
  const nowIso = new Date(nowMs()).toISOString();
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
  const nonViolentPersistence = daysActive(nonViolentActivityTrend, nonViolentActivityLabels);
  const violentPersistence = daysActive(violentActivityTrend, violentActivityLabels);

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Non-Violent Activities</CardTitle>
            <CardDescription>e.g. rally, sighting — most-recorded non-violent activity types.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopIncidentTypesChart data={withShortLabels(topNonViolentActivities)} total={nonViolent.length} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Violent Activities</CardTitle>
            <CardDescription>e.g. bombing, shooting incident — most-recorded violent activity types.</CardDescription>
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
            <CardDescription>
              Daily count per top activity type, last {ACTIVITY_TREND_WINDOW_DAYS} days — shows which
              activities keep recurring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTrendChart data={nonViolentActivityTrend} activityLabels={nonViolentActivityLabels} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Violent Activity Trend</CardTitle>
            <CardDescription>
              Daily count per top activity type, last {ACTIVITY_TREND_WINDOW_DAYS} days — shows which
              activities keep recurring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTrendChart data={violentActivityTrend} activityLabels={violentActivityLabels} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Persisting Non-Violent Activities</CardTitle>
            <CardDescription>
              Days active out of the last {ACTIVITY_TREND_WINDOW_DAYS} — the activity that keeps
              recurring, not just the one with the biggest single-day spike.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopIncidentTypesChart data={nonViolentPersistence} total={ACTIVITY_TREND_WINDOW_DAYS} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Persisting Violent Activities</CardTitle>
            <CardDescription>
              Days active out of the last {ACTIVITY_TREND_WINDOW_DAYS} — the activity that keeps
              recurring, not just the one with the biggest single-day spike.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopIncidentTypesChart data={violentPersistence} total={ACTIVITY_TREND_WINDOW_DAYS} />
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

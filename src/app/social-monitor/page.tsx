import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessSocialMonitor } from "@/lib/rbac";
import { getSocialMonitorData } from "@/lib/queries/social-monitor";
import { getSocialMonitorPeriodComparison } from "@/lib/queries/social-monitor-dashboard";
import { computeSocialMonitorAssessment } from "@/lib/social-monitor-assessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { SocialPostFormDialog } from "@/components/social-post-form-dialog";
import { SocialSyncButton } from "@/components/social-sync-button";
import { SocialMonitorFeed } from "@/components/social-monitor-feed";
import { SocialMonitorPeriodForm } from "@/components/social-monitor-period-form";
import { GroupedBarChart, type GroupedBarDatum } from "@/components/charts/grouped-bar-chart";
import { DualLineChart, type DualLineDatum } from "@/components/charts/dual-line-chart";
import { ComboBarLineChart } from "@/components/charts/combo-bar-line-chart";
import { SeverityMixChart } from "@/components/charts/severity-mix-chart";
import { Button } from "@/components/ui/button";
import { FacebookLogo } from "@/components/icons/facebook-logo";
import { FileText, Flag, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

function relativeSyncLabel(date: Date | null): string {
  if (!date) return "Not yet run";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive calendar-date string -> the UTC instant it starts at. */
function dateStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Inclusive calendar-date string -> the exclusive UTC upper bound that
 * covers the entire day (start of the following day). */
function dateEndExclusive(dateStr: string): Date {
  const d = dateStart(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function addCalendarDays(dateStr: string, days: number): string {
  const d = dateStart(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

/** Monday of the calendar week containing dateStr (weeks run Mon-Sun). */
function mondayOfWeek(dateStr: string): string {
  const d = dateStart(dateStr);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0, ...
  return addCalendarDays(dateStr, -daysSinceMonday);
}

/** "+12%" / "-8%" / "New" (compared period had none on file) / "0%" (both
 * periods had none) — never divides by zero. */
function pctChange(selected: number, compared: number): string {
  if (compared === 0) return selected === 0 ? "0%" : "New";
  const pct = ((selected - compared) / compared) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export default async function SocialMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ spStart?: string; spEnd?: string; cpStart?: string; cpEnd?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessSocialMonitor(user)) {
    notFound();
  }

  const params = await searchParams;

  // Selected Period defaults to the current calendar week (Monday-Sunday);
  // Compared Period defaults to the calendar week immediately before it —
  // a fixed weekly cadence rather than a rolling N-day window.
  const today = new Date();
  const currentWeekMonday = mondayOfWeek(isoDate(today));
  const currentWeekSunday = addCalendarDays(currentWeekMonday, 6);
  const previousWeekMonday = addCalendarDays(currentWeekMonday, -7);
  const previousWeekSunday = addCalendarDays(currentWeekMonday, -1);

  const spStartStr = params.spStart || currentWeekMonday;
  const spEndStr = params.spEnd || currentWeekSunday;
  const selectedStart = dateStart(spStartStr);
  const selectedEnd = dateEndExclusive(spEndStr);

  const cpStartStr = params.cpStart || previousWeekMonday;
  const cpEndStr = params.cpEnd || previousWeekSunday;
  const comparedStart = dateStart(cpStartStr);
  const comparedEnd = dateEndExclusive(cpEndStr);

  const [data, comparison] = await Promise.all([
    getSocialMonitorData(),
    getSocialMonitorPeriodComparison(
      { start: selectedStart, end: selectedEnd },
      { start: comparedStart, end: comparedEnd }
    ),
  ]);
  const assessment = computeSocialMonitorAssessment(data);
  const { selected, compared } = comparison;

  // Same topic set as ranked in the Selected Period — Compared Period's
  // count for a topic outside that top-10 just doesn't have a bar, same
  // as it wouldn't for Selected either.
  const comparedTopicByLabel = new Map(compared.topicCounts.map((t) => [t.label, t.count]));
  const topicComparison: GroupedBarDatum[] = selected.topicCounts.map((t) => ({
    label: t.label,
    selected: t.count,
    compared: comparedTopicByLabel.get(t.label) ?? 0,
  }));

  const dayCount = Math.max(selected.postsByDay.length, compared.postsByDay.length);
  const postsOverTime: DualLineDatum[] = Array.from({ length: dayCount }, (_, i) => ({
    dayIndex: i + 1,
    selected: selected.postsByDay[i]?.count ?? 0,
    compared: compared.postsByDay[i]?.count ?? 0,
    selectedDate: selected.postsByDay[i]?.date ?? "",
    comparedDate: compared.postsByDay[i]?.date ?? "",
  }));

  const CLASSIFICATION_COLORS = {
    violent: "var(--status-critical)",
    nonViolent: "var(--status-warning)",
    unclassified: "var(--muted)",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FacebookLogo className="size-6" />
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            Facebook Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SocialMonitorPeriodForm spStart={spStartStr} spEnd={spEndStr} cpStart={cpStartStr} cpEnd={cpEndStr} />
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <SocialSyncButton />
              <SocialPostFormDialog trigger={<Button>Log Post</Button>} />
            </div>
            <span className="text-xs text-muted-foreground">
              Last synced: {relativeSyncLabel(data.lastSyncedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Total Posts"
          value={selected.totalCount.toLocaleString()}
          hint={`Previous Week: ${compared.totalCount.toLocaleString()} (${pctChange(selected.totalCount, compared.totalCount)})`}
          icon={FileText}
        />
        <StatTile
          label="Violent"
          value={selected.violentCount.toLocaleString()}
          hint={`Previous Week: ${compared.violentCount.toLocaleString()} (${pctChange(selected.violentCount, compared.violentCount)})`}
          icon={ShieldAlert}
          tone="critical"
        />
        <StatTile
          label="Non-Violent"
          value={selected.nonViolentCount.toLocaleString()}
          hint={`Previous Week: ${compared.nonViolentCount.toLocaleString()} (${pctChange(selected.nonViolentCount, compared.nonViolentCount)})`}
          icon={ShieldCheck}
          tone="good"
        />
        <StatTile
          label="Highlighted"
          value={selected.highlightedCount.toLocaleString()}
          hint={`Previous Week: ${compared.highlightedCount.toLocaleString()} (${pctChange(selected.highlightedCount, compared.highlightedCount)})`}
          icon={Flag}
          tone="critical"
        />
        <StatTile
          label="Auto-Fetched"
          value={selected.autoCount.toLocaleString()}
          hint={`Previous Week: ${compared.autoCount.toLocaleString()} (${pctChange(selected.autoCount, compared.autoCount)})`}
          icon={Clock}
        />
        <StatTile
          label="Manually Logged"
          value={selected.manualCount.toLocaleString()}
          hint={`Previous Week: ${compared.manualCount.toLocaleString()} (${pctChange(selected.manualCount, compared.manualCount)})`}
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Posts by Topic — Current Week vs Previous Week</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart data={topicComparison} selectedLabel="Current Week" comparedLabel="Previous Week" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posts Over Time — Current Week vs Previous Week</CardTitle>
          </CardHeader>
          <CardContent>
            <DualLineChart data={postsOverTime} selectedLabel="Current Week" comparedLabel="Previous Week" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posts by Classification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Current Week</span>
                <SeverityMixChart
                  total={selected.totalCount}
                  segments={[
                    { label: "Violent", count: selected.violentCount, color: CLASSIFICATION_COLORS.violent },
                    { label: "Non-Violent", count: selected.nonViolentCount, color: CLASSIFICATION_COLORS.nonViolent },
                    { label: "Unclassified", count: selected.unclassifiedCount, color: CLASSIFICATION_COLORS.unclassified },
                  ]}
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Previous Week</span>
                <SeverityMixChart
                  total={compared.totalCount}
                  segments={[
                    { label: "Violent", count: compared.violentCount, color: CLASSIFICATION_COLORS.violent },
                    { label: "Non-Violent", count: compared.nonViolentCount, color: CLASSIFICATION_COLORS.nonViolent },
                    { label: "Unclassified", count: compared.unclassifiedCount, color: CLASSIFICATION_COLORS.unclassified },
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posts &amp; Flagged by Day — Current Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ComboBarLineChart data={selected.postsByDay} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monitored Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <SocialMonitorFeed
            posts={data.posts.map((p) => ({
              ...p,
              postedAt: p.postedAt.toISOString(),
              createdAt: p.createdAt.toISOString(),
            }))}
            canWrite
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Interpretation &amp; Assessment</CardTitle>
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

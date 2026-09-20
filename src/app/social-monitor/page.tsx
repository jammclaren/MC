import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessSocialMonitor, canWriteSocialMonitor } from "@/lib/rbac";
import { getSocialMonitorData } from "@/lib/queries/social-monitor";
import { getSocialMonitorPeriodComparison } from "@/lib/queries/social-monitor-dashboard";
import { computeSocialMonitorAssessment } from "@/lib/social-monitor-assessment";
import { computeRecommendedActions } from "@/lib/social-monitor-recommendations";
import {
  getSocialListeningReport,
  listSocialListeningReportOptions,
} from "@/lib/queries/social-listening";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { SocialPostFormDialog } from "@/components/social-post-form-dialog";
import { SocialSyncButton } from "@/components/social-sync-button";
import { SocialMonitorFeed } from "@/components/social-monitor-feed";
import { SocialMonitorPeriodForm } from "@/components/social-monitor-period-form";
import { SocialListeningReportFormDialog } from "@/components/social-listening-report-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { GroupedBarChart, type GroupedBarDatum } from "@/components/charts/grouped-bar-chart";
import { DualLineChart, type DualLineDatum } from "@/components/charts/dual-line-chart";
import { ComboBarLineChart } from "@/components/charts/combo-bar-line-chart";
import { SeverityMixChart } from "@/components/charts/severity-mix-chart";
import { HorizontalBarList } from "@/components/charts/horizontal-bar-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FacebookLogo } from "@/components/icons/facebook-logo";
import { NavCollapseToggle } from "@/components/nav-collapse-toggle";
import { ExternalLink, FileText, Flag, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

/** Best-effort tone from a free-text risk/status label — display only,
 * never fed back into logic, since these values are staff-transcribed
 * free text rather than a fixed enum. */
function riskTone(label: string): "critical" | "warning" | "good" | "outline" {
  const upper = label.toUpperCase();
  if (upper.includes("HIGH") || upper.includes("SENSITIVE")) return "critical";
  if (upper.includes("MODERATE")) return "warning";
  if (upper.includes("LOW")) return "good";
  return "outline";
}

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
  searchParams: Promise<{
    spStart?: string;
    spEnd?: string;
    cpStart?: string;
    cpEnd?: string;
    reportId?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessSocialMonitor(user)) {
    notFound();
  }
  const canWrite = canWriteSocialMonitor(user);

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

  const [data, comparison, socialListeningReport, socialListeningReportOptions] = await Promise.all([
    getSocialMonitorData(),
    getSocialMonitorPeriodComparison(
      { start: selectedStart, end: selectedEnd },
      { start: comparedStart, end: comparedEnd }
    ),
    getSocialListeningReport(params.reportId),
    listSocialListeningReportOptions(),
  ]);
  const assessment = computeSocialMonitorAssessment(data);
  const { selected, compared } = comparison;
  const recommendedActions = computeRecommendedActions(selected, compared);

  // Same topic set as ranked in the Selected Period — Compared Period's
  // count for a topic outside that top-10 just doesn't have a bar, same
  // as it wouldn't for Selected either.
  const comparedTopicByLabel = new Map(compared.topicCounts.map((t) => [t.label, t.count]));
  // Abbreviated for this chart's x-axis only — full names stay everywhere
  // else (filters, badges, assessment text).
  const CHART_TOPIC_LABELS: Record<string, string> = {
    "Election Related": "ERP",
    "Peace Inclined Armed Groups": "PIAGs",
  };
  const topicComparison: GroupedBarDatum[] = selected.topicCounts.map((t) => ({
    label: CHART_TOPIC_LABELS[t.label] ?? t.label,
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

  const coreMentions = socialListeningReport
    ? socialListeningReport.issues.reduce((sum, i) => sum + i.mentions, 0)
    : 0;
  const issuesByVolume = socialListeningReport
    ? [...socialListeningReport.issues]
        .sort((a, b) => b.mentions - a.mentions)
        .map((i) => ({ label: i.label, value: i.mentions }))
    : [];
  const platformDistribution = socialListeningReport
    ? [...socialListeningReport.platformMentions]
        .sort((a, b) => b.mentions - a.mentions)
        .map((p) => ({ label: p.platform, value: p.mentions }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="facebook">
        <TabsList variant="line">
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="social-listening">Social Listening Report</TabsTrigger>
        </TabsList>

        <TabsContent value="facebook" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FacebookLogo className="size-6" />
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            Facebook Dashboard
          </h1>
          <NavCollapseToggle />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SocialMonitorPeriodForm spStart={spStartStr} spEnd={spEndStr} cpStart={cpStartStr} cpEnd={cpEndStr} />
          <div className="flex flex-col items-end gap-1">
            {canWrite && (
              <div className="flex gap-2">
                <SocialSyncButton />
                <SocialPostFormDialog trigger={<Button>Log Post</Button>} />
              </div>
            )}
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
            canWrite={canWrite}
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

      <Card>
        <CardHeader>
          <CardTitle>Auto Generate Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {recommendedActions.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="social-listening" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-xl font-bold tracking-wide uppercase">
                Social Listening Report
              </h2>
              {socialListeningReport && (
                <span className="text-sm text-muted-foreground">
                  {socialListeningReport.periodLabel}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {socialListeningReportOptions.length > 1 && (
                <form method="get" className="flex items-end gap-2">
                  <select
                    name="reportId"
                    defaultValue={socialListeningReport?.id}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {socialListeningReportOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.periodLabel}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" size="sm">
                    View
                  </Button>
                </form>
              )}
              {canWrite && (
                <SocialListeningReportFormDialog
                  trigger={<Button>Log New Report</Button>}
                />
              )}
              {socialListeningReport && canWrite && (
                <>
                  <SocialListeningReportFormDialog
                    initial={{
                      id: socialListeningReport.id,
                      periodLabel: socialListeningReport.periodLabel,
                      uniqueSources: String(socialListeningReport.uniqueSources),
                      engagementLabel: socialListeningReport.engagementLabel,
                      overallRiskLevel: socialListeningReport.overallRiskLevel,
                      riskRationale: socialListeningReport.riskRationale,
                      dominantNarratives: socialListeningReport.dominantNarratives,
                      emergingNarratives: socialListeningReport.emergingNarratives,
                      indicatorsToWatch: socialListeningReport.indicatorsToWatch,
                      issues: socialListeningReport.issues.map((i) => ({
                        label: i.label,
                        mentions: String(i.mentions),
                        engagementLabel: i.engagementLabel,
                        reachLabel: i.reachLabel,
                        authors: String(i.authors),
                        status: i.status,
                        riskLevel: i.riskLevel,
                      })),
                      platformMentions: socialListeningReport.platformMentions.map((p) => ({
                        platform: p.platform,
                        mentions: String(p.mentions),
                      })),
                      significantActivities: socialListeningReport.significantActivities.map(
                        (a) => ({
                          title: a.title,
                          subtitle: a.subtitle,
                          sourceUrl: a.sourceUrl ?? "",
                          analysis: a.analysis,
                          assessment: a.assessment,
                        })
                      ),
                    }}
                    trigger={<Button variant="outline">Edit Report</Button>}
                  />
                  <DeleteButton
                    url={`/api/social-listening-reports/${socialListeningReport.id}`}
                    confirmMessage="Delete this Social Listening report? This cannot be undone."
                  />
                </>
              )}
            </div>
          </div>

          {!socialListeningReport && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {canWrite
                ? 'No Social Listening report logged yet — click "Log New Report" to add the first one.'
                : "No Social Listening report logged yet."}
            </p>
          )}

          {socialListeningReport && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatTile label="Core Mentions" value={coreMentions.toLocaleString()} icon={FileText} />
                <StatTile
                  label="Unique Sources"
                  value={socialListeningReport.uniqueSources.toLocaleString()}
                  icon={FileText}
                />
                <StatTile label="Engagement" value={socialListeningReport.engagementLabel} icon={Flag} />
                <StatTile
                  label="Significant Activities"
                  value={socialListeningReport.significantActivities.length.toLocaleString()}
                  icon={ShieldAlert}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Issues by Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HorizontalBarList data={issuesByVolume} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Platform Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HorizontalBarList data={platformDistribution} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Issue Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue</TableHead>
                        <TableHead className="text-right">Mentions</TableHead>
                        <TableHead className="text-right">Engagement</TableHead>
                        <TableHead className="text-right">Reach</TableHead>
                        <TableHead className="text-right">Authors</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {socialListeningReport.issues.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell className="font-medium">{issue.label}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {issue.mentions.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {issue.engagementLabel}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {issue.reachLabel}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {issue.authors.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={riskTone(issue.status)}>{issue.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={riskTone(issue.riskLevel)}>{issue.riskLevel}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {socialListeningReport.issues.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No issues logged for this report.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Narratives &amp; Risk Indicators</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Dominant Narratives
                      </span>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {socialListeningReport.dominantNarratives.map((n, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Emerging / Sensitive Narratives
                      </span>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {socialListeningReport.emergingNarratives.map((n, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Indicators to Watch
                      </span>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {socialListeningReport.indicatorsToWatch.map((n, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border p-3">
                    <Badge variant={riskTone(socialListeningReport.overallRiskLevel)}>
                      {socialListeningReport.overallRiskLevel}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {socialListeningReport.riskRationale}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Significant Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {socialListeningReport.significantActivities.map((activity) => (
                      <div key={activity.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="font-medium">{activity.title}</div>
                          {activity.sourceUrl && (
                            <a
                              href={activity.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Source <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{activity.subtitle}</p>
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Analysis: </span>
                          {activity.analysis}
                        </p>
                        <p className="mt-1 text-sm">
                          <span className="font-medium">Assessment: </span>
                          {activity.assessment}
                        </p>
                      </div>
                    ))}
                    {socialListeningReport.significantActivities.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No significant activities logged for this report.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

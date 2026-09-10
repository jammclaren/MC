import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessSocialMonitor } from "@/lib/rbac";
import { getSocialMonitorData } from "@/lib/queries/social-monitor";
import { computeSocialMonitorAssessment, topByFrequency } from "@/lib/social-monitor-assessment";
import { TOPIC_LABELS } from "@/lib/social-classifier";
import type { SocialPostTopic } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { SocialPostFormDialog } from "@/components/social-post-form-dialog";
import { SocialSyncButton } from "@/components/social-sync-button";
import { SocialMonitorFeed } from "@/components/social-monitor-feed";
import { LabeledBarChart } from "@/components/charts/labeled-bar-chart";
import { Button } from "@/components/ui/button";
import { FileText, Flag, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

function relativeSyncLabel(date: Date | null): string {
  if (!date) return "Not yet run";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export default async function SocialMonitorPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessSocialMonitor(user)) {
    notFound();
  }

  const data = await getSocialMonitorData();
  const assessment = computeSocialMonitorAssessment(data);
  // Same ranking function the assessment's "Most-cited topic(s)" line uses
  // — this chart and that line can never disagree with each other.
  const byTopic = topByFrequency(
    data.posts.map((p) => (p.topic ? (TOPIC_LABELS[p.topic as SocialPostTopic] ?? p.topic) : "Unspecified")),
    11
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            Social Media Monitor
          </h1>
        </div>
        <div className="flex gap-2">
          <SocialSyncButton />
          <SocialPostFormDialog trigger={<Button>Log Post</Button>} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Total Posts" value={data.totalCount} icon={FileText} />
        <StatTile
          label="Highlighted"
          value={data.highlightedCount}
          icon={Flag}
          tone="critical"
        />
        <StatTile
          label="Violent"
          value={data.violentCount}
          icon={ShieldAlert}
          tone="critical"
        />
        <StatTile
          label="Non-Violent"
          value={data.nonViolentCount}
          icon={ShieldCheck}
          tone="good"
        />
        <StatTile
          label="Last Synced"
          value={relativeSyncLabel(data.lastSyncedAt)}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BY TOPIC</CardTitle>
        </CardHeader>
        <CardContent>
          <LabeledBarChart data={byTopic} color="var(--chart-5)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monitored Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <SocialMonitorFeed
            posts={data.posts.map((p) => ({
              ...p,
              postedAt: p.postedAt.toISOString(),
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

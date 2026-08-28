"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { GaugeMeter } from "@/components/gauge-meter";
import { FunnelPanel } from "@/components/funnel-panel";
import { LabeledBarChart } from "@/components/charts/labeled-bar-chart";
import { OverviewIncidentMapLoader } from "@/components/overview-incident-map-loader";
import { isViolentIncidentType } from "@/lib/incident-classification";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import { AlertTriangle } from "lucide-react";

const TOP_TYPES_LIMIT = 5;
const LAST_24H_MS = 24 * 60 * 60 * 1000;

/** "14 September 2026" — day-month-year, independent of locale part ordering. */
function formatDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

function daysRemaining(endIso: string): number | null {
  const end = new Date(endIso);
  const now = new Date();
  if (now > end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export interface TopPriorityAreaSummary {
  label: string;
  priorityScore: number;
}

export function OverviewIncidentOpsPanel({
  markers,
  topPriorityAreas,
  priorityAreaCount,
  bpeEndDate,
  now,
}: {
  markers: IncidentMarker[];
  topPriorityAreas: TopPriorityAreaSummary[];
  priorityAreaCount: number;
  bpeEndDate: string;
  /** Request-time timestamp (ms), computed server-side and passed down so
   * the "last 24h" calculation stays a pure function of props. */
  now: number;
}) {
  const stats = useMemo(() => {
    const total = markers.length;
    const last24h = markers.filter(
      (m) => now - new Date(m.createdAt).getTime() <= LAST_24H_MS
    );
    const withResult = markers.filter((m) => m.result != null && m.result.trim() !== "");
    const violent = markers.filter((m) => isViolentIncidentType(m.type));

    const byJtf = new Map<string, number>();
    const byType = new Map<string, number>();
    const bySource = { LOGGED: 0, MAP_MARKER: 0 };
    for (const m of markers) {
      byJtf.set(m.jtfName, (byJtf.get(m.jtfName) ?? 0) + 1);
      byType.set(m.type, (byType.get(m.type) ?? 0) + 1);
      bySource[m.source] += 1;
    }

    const jtfChartData = Array.from(byJtf.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const topTypes = Array.from(byType.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_TYPES_LIMIT);

    const mostRecent = markers[0] ?? null;

    const outcomeRatePct = total > 0 ? (withResult.length / total) * 100 : 0;
    const violentLast24h = last24h.some((m) => isViolentIncidentType(m.type));

    return {
      total,
      last24hCount: last24h.length,
      violentLast24h,
      outcomeRatePct,
      jtfChartData,
      topTypes,
      mostRecent,
      sourceStages: [
        { label: "Total Plotted", count: total },
        { label: "Logged Incident", count: bySource.LOGGED },
        { label: "Map Marker", count: bySource.MAP_MARKER },
      ],
      severityStages: [
        { label: "Total Plotted", count: total },
        { label: "Armed / Violent Type", count: violent.length },
        { label: "Other", count: total - violent.length },
      ],
    };
  }, [markers, now]);

  const remaining = daysRemaining(bpeEndDate);
  const topArea = topPriorityAreas[0] ?? null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs font-semibold tracking-widest text-primary uppercase">
            Command Overview // Sector-Wide
          </p>
          <CardTitle className="text-xl">Monitored Incidents Map</CardTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          {priorityAreaCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-md border border-status-critical/40 bg-status-critical/10 px-2.5 py-1 text-xs font-medium text-status-critical">
              <AlertTriangle className="size-3.5" />
              {priorityAreaCount.toLocaleString()} priority area(s) flagged
            </span>
          )}
          {stats.violentLast24h && (
            <span className="flex items-center gap-1.5 rounded-md border border-status-critical/40 bg-status-critical/10 px-2.5 py-1 text-xs font-medium text-status-critical">
              <AlertTriangle className="size-3.5" />
              Armed incident in last 24h
            </span>
          )}
          <Link href="/priority-map" className="self-center text-sm text-primary hover:underline">
            Open Situation Map →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Incidents Plotted" value={stats.total.toLocaleString()} />
              <StatTile label="Logged (24h)" value={stats.last24hCount.toLocaleString()} />
            </div>
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Incidents by JTF
              </h3>
              <LabeledBarChart data={stats.jtfChartData} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-around">
              <GaugeMeter
                value={stats.outcomeRatePct}
                label="Outcome Reporting Rate"
                caption="Plotted incidents with a result on file"
              />
              <div className="w-full max-w-xs">
                <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Top Incident Types
                </h3>
                <FunnelPanel stages={stats.topTypes} />
              </div>
            </div>
            <OverviewIncidentMapLoader markers={markers} />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                By Source
              </h3>
              <FunnelPanel stages={stats.sourceStages} />
            </div>
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Severity Mix
              </h3>
              <FunnelPanel stages={stats.severityStages} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Most Recent Report
            </span>
            {stats.mostRecent ? (
              <p className="text-sm">
                <span className="font-medium">{stats.mostRecent.type}</span>
                {stats.mostRecent.areaLabel ? ` — ${stats.mostRecent.areaLabel}` : ""}
                <br />
                <span className="text-muted-foreground">
                  {stats.mostRecent.jtfName} · {new Date(stats.mostRecent.date).toLocaleDateString()}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No plotted incidents yet.</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Top Priority Area
            </span>
            {topArea ? (
              <p className="text-sm">
                <span className="font-medium">{topArea.label}</span>
                <br />
                <span className="text-muted-foreground">
                  Priority score {topArea.priorityScore.toFixed(1)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No priority areas scored yet.</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              BPE Window Closes
            </span>
            <p className="text-sm">
              <span className="font-medium">{formatDate(bpeEndDate)}</span>
              <br />
              <span className="text-muted-foreground">
                {remaining === null ? "Window concluded" : `${remaining} day(s) remaining`}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { BpeCountdown } from "@/components/bpe-countdown";
import { FunnelPanel } from "@/components/funnel-panel";
import { LabeledBarChart } from "@/components/charts/labeled-bar-chart";
import { IncidentsByDayChart, type IncidentsByDayDatum } from "@/components/charts/incidents-by-day-chart";
import { PriorityLeaderboard, type LeaderboardEntry } from "@/components/priority-leaderboard";
import { OverviewIncidentMapLoader } from "@/components/overview-incident-map-loader";
import { isViolentIncidentType } from "@/lib/incident-classification";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import { AlertTriangle } from "lucide-react";

const TOP_TYPES_LIMIT = 5;
const LAST_24H_MS = 24 * 60 * 60 * 1000;

export function OverviewIncidentOpsPanel({
  markers,
  topPriorityAreas,
  incidentsByDay,
  totalDeployed,
  totalQrf,
  bpeStartDate,
  bpeEndDate,
  now,
}: {
  markers: IncidentMarker[];
  topPriorityAreas: LeaderboardEntry[];
  incidentsByDay: IncidentsByDayDatum[];
  totalDeployed: number;
  totalQrf: number;
  bpeStartDate: string;
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

    const violentLast24h = last24h.some((m) => isViolentIncidentType(m.type));

    return {
      total,
      last24hCount: last24h.length,
      violentLast24h,
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
              <LabeledBarChart data={stats.jtfChartData} height={140} />
            </div>
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Incidents (14d)
              </h3>
              <IncidentsByDayChart data={incidentsByDay} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <OverviewIncidentMapLoader markers={markers} />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Priority Leaderboard
              </h3>
              <PriorityLeaderboard entries={topPriorityAreas} />
            </div>
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Top Incident Types
              </h3>
              <FunnelPanel stages={stats.topTypes} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div>
            <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              By Source
            </span>
            <FunnelPanel stages={stats.sourceStages} />
          </div>
          <div>
            <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Severity Mix
            </span>
            <FunnelPanel stages={stats.severityStages} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Troops Deployed
              </span>
              <p className="text-sm">
                <span className="font-medium">{totalDeployed.toLocaleString()} to polling</span>
                <br />
                <span className="text-muted-foreground">{totalQrf.toLocaleString()} QRF</span>
              </p>
            </div>
            <BpeCountdown startDate={bpeStartDate} endDate={bpeEndDate} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

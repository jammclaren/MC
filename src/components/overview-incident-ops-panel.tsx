"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { CapsuleBarChart } from "@/components/charts/capsule-bar-chart";
import { IncidentsByDayChart, type IncidentsByDayDatum } from "@/components/charts/incidents-by-day-chart";
import { TopIncidentTypesChart } from "@/components/charts/top-incident-types-chart";
import { SeverityMixChart } from "@/components/charts/severity-mix-chart";
import { OverviewIncidentMapLoader } from "@/components/overview-incident-map-loader";
import { isViolentIncidentType } from "@/lib/incident-classification";
import type { IncidentMarker } from "@/lib/queries/incident-markers";
import { AlertTriangle } from "lucide-react";

const TOP_TYPES_LIMIT = 5;
const LAST_24H_MS = 24 * 60 * 60 * 1000;

export function OverviewIncidentOpsPanel({
  markers,
  incidentsByDay,
  now,
  canAccessSituationMap = true,
}: {
  markers: IncidentMarker[];
  incidentsByDay: IncidentsByDayDatum[];
  /** Request-time timestamp (ms), computed server-side and passed down so
   * the "last 24h" calculation stays a pure function of props. */
  now: number;
  /** BRIGADE_STAFF has no access to /priority-map at all (see rbac.ts
   * canAccessPage) — the nav already hides that link, but this card's own
   * shortcut needs the same guard or it'd be a stray way in. */
  canAccessSituationMap?: boolean;
}) {
  const stats = useMemo(() => {
    const total = markers.length;
    const last24h = markers.filter(
      (m) => now - new Date(m.createdAt).getTime() <= LAST_24H_MS
    );
    const violent = markers.filter((m) => isViolentIncidentType(m.type));

    const byJtf = new Map<string, number>();
    const byType = new Map<string, number>();
    for (const m of markers) {
      byJtf.set(m.jtfName, (byJtf.get(m.jtfName) ?? 0) + 1);
      byType.set(m.type, (byType.get(m.type) ?? 0) + 1);
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
      severitySegments: [
        { label: "Armed / Violent Type", count: violent.length, color: "var(--chart-1)" },
        { label: "Other", count: total - violent.length, color: "var(--chart-5)" },
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
          {canAccessSituationMap && (
            <Link href="/priority-map" className="self-center text-sm text-primary hover:underline">
              Open Situation Map →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Incidents Plotted" value={stats.total.toLocaleString()} />
              <StatTile label="Logged (24h)" value={stats.last24hCount.toLocaleString()} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Incidents by JTF
              </h3>
              <div className="min-h-[140px] flex-1">
                <CapsuleBarChart data={stats.jtfChartData} />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Incidents (14d)
              </h3>
              <div className="min-h-[180px] flex-1">
                <IncidentsByDayChart data={incidentsByDay} height="100%" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="min-h-[400px] flex-1">
              <OverviewIncidentMapLoader markers={markers} />
            </div>
            <div className="rounded-md border border-border p-3">
              <h3 className="mb-1 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Most Recent Report
              </h3>
              {stats.mostRecent ? (
                <p className="text-sm">
                  <span className="line-clamp-2 font-medium" title={stats.mostRecent.type}>
                    {stats.mostRecent.type}
                  </span>
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
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Top Incident Types
              </h3>
              <TopIncidentTypesChart data={stats.topTypes} total={stats.total} />
            </div>
            <div>
              <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Severity Mix
              </h3>
              <SeverityMixChart total={stats.total} segments={stats.severitySegments} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

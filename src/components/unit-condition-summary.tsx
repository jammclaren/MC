"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ratingForPct } from "@/lib/unit-condition";
import type { UnitConditionJtfGroup } from "@/lib/queries/unit-conditions";

function ReadinessGauge({ pct }: { pct: number | null }) {
  const rating = pct === null ? null : ratingForPct(pct);
  const data = [
    { name: "filled", value: pct ?? 0, color: rating?.color ?? "var(--muted)" },
    { name: "remainder", value: 100 - (pct ?? 0), color: "var(--muted)" },
  ];

  return (
    <div className="relative size-[84px] shrink-0">
      <div className="neu-inset absolute inset-0 rounded-full bg-input" />
      <ResponsiveContainer
        width="100%"
        height="100%"
        style={{
          filter:
            "drop-shadow(4px 4px 6px rgba(0, 0, 0, 0.5)) drop-shadow(-3px -3px 5px rgba(255, 255, 255, 0.05))",
        }}
      >
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold text-foreground">{pct ?? "—"}</span>
      </div>
    </div>
  );
}

/** One gauge tile — a name, its readiness gauge, and an R1-R4 badge (or
 * "Not set" when there's no rating yet). Shared by both the by-JTF grid
 * (command-wide viewers) and the by-Task-Group grid (JTF account
 * viewers, see UnitConditionSummary) since the tile itself is identical,
 * only which thing gets one differs. */
function GaugeTile({ name, pct }: { name: string; pct: number | null }) {
  const rating = pct === null ? null : ratingForPct(pct);
  return (
    <div className="neu-raised flex items-center gap-3 rounded-md bg-card p-3">
      <ReadinessGauge pct={pct} />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-display text-sm font-semibold tracking-wide uppercase">{name}</span>
        {rating ? (
          <span
            className="w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: `color-mix(in oklch, ${rating.color}, transparent 80%)`,
              color: rating.color,
            }}
          >
            {rating.code} · {rating.label}
          </span>
        ) : (
          <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            Not set
          </span>
        )}
      </div>
    </div>
  );
}

/** A JTF's own readiness % elsewhere on this file (the by-JTF grid) is a
 * rollup, not a repeat of the per-task-group detail — the average of its
 * Task Groups' overall %. A JTF with no Task Groups yet shows "Not set". */
function jtfRollupPct(group: UnitConditionJtfGroup): number | null {
  if (group.taskGroups.length === 0) return null;
  return Math.round(
    group.taskGroups.reduce((sum, tg) => sum + tg.overallPct, 0) / group.taskGroups.length
  );
}

/**
 * Overview's Unit Readiness Status card. Command-wide viewers (ADMIN,
 * COMMAND, WFC_STAFF, a command-wide VIEWER) see one gauge per JTF — a
 * rollup, since the per-Task-Group breakdown for every JTF at once would
 * be too much detail for a command-wide summary. A JTF account
 * (viewerJtfId set) instead sees their own JTF's Task Groups broken out
 * one gauge each, since "by JTF" would just be a single tile repeating
 * what JTF REDCON already shows in full.
 */
export function UnitConditionSummary({
  groups,
  viewerJtfId,
}: {
  groups: UnitConditionJtfGroup[];
  viewerJtfId: string | null;
}) {
  if (viewerJtfId) {
    const own = groups.find((g) => g.jtfId === viewerJtfId);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unit Readiness Status</CardTitle>
        </CardHeader>
        <CardContent>
          {!own || own.taskGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No task groups yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {own.taskGroups.map((tg) => (
                <GaugeTile key={tg.id} name={tg.taskGroupName} pct={tg.overallPct} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Readiness Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <GaugeTile key={group.jtfId} name={group.jtfName} pct={jtfRollupPct(group)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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

/** A JTF's own readiness % on Overview is a rollup, not a repeat of the
 * per-task-group detail JTF Accounts shows — the average of its rated
 * task groups' overall %, ignoring any not-yet-rated ones. A JTF with no
 * rated task groups (or none reported at all) shows "Not set". */
function jtfRollupPct(group: UnitConditionJtfGroup): number | null {
  const rated = group.taskGroups.filter(
    (tg): tg is typeof tg & { overallPct: number } => tg.overallPct !== null
  );
  if (rated.length === 0) return null;
  return Math.round(rated.reduce((sum, tg) => sum + tg.overallPct, 0) / rated.length);
}

/** Read-only Overview summary of every JTF's current Unit Readiness rating
 * — a 2-up grid of radial gauges, one per JTF, each the average of that
 * JTF's rated Task Groups. The per-Task-Group breakdown lives on the JTF
 * Accounts page, not here. */
export function UnitConditionSummary({ groups }: { groups: UnitConditionJtfGroup[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Readiness Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups.map((group) => {
            const pct = jtfRollupPct(group);
            const rating = pct === null ? null : ratingForPct(pct);
            return (
              <div
                key={group.jtfId}
                className="neu-raised flex items-center gap-3 rounded-md bg-card p-3"
              >
                <ReadinessGauge pct={pct} />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-display text-sm font-semibold tracking-wide uppercase">
                    {group.jtfName}
                  </span>
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
          })}
        </div>
      </CardContent>
    </Card>
  );
}

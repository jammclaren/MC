"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ratingForPct } from "@/lib/unit-condition";
import type { UnitConditionJtfGroup } from "@/lib/queries/unit-conditions";

function ReadinessGauge({ pct }: { pct: number }) {
  const rating = ratingForPct(pct);
  const data = [
    { name: "filled", value: pct, color: rating.color },
    { name: "remainder", value: 100 - pct, color: "var(--muted)" },
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
        <span className="text-lg font-semibold text-foreground">{pct}</span>
      </div>
    </div>
  );
}

/** Read-only view of every JTF's Unit Readiness Condition broken down by
 * Task Group — same data UnitConditionCard edits, just view-only, for
 * JTF REDCON (WFC_STAFF/COMMAND/ADMIN). No inputs, no add/edit affordances. */
export function JtfRedconView({ groups }: { groups: UnitConditionJtfGroup[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Readiness Condition by Task Group</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.jtfId} className="flex flex-col gap-2">
            <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {group.jtfName}
            </span>
            {group.taskGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No task groups yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.taskGroups.map((tg) => {
                  const rating = ratingForPct(tg.overallPct);
                  return (
                    <div
                      key={tg.id}
                      className="neu-raised flex items-center gap-3 rounded-md bg-card p-3"
                    >
                      <ReadinessGauge pct={tg.overallPct} />
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-sm font-semibold">{tg.taskGroupName}</span>
                        <span
                          className="w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `color-mix(in oklch, ${rating.color}, transparent 80%)`,
                            color: rating.color,
                          }}
                        >
                          {rating.code} · {rating.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

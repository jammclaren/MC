"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export interface SeverityMixSegment {
  label: string;
  count: number;
  /** CSS color value — pass the app's categorical chart tokens (e.g.
   * var(--chart-1)), never a raw hex, so it stays in step with the rest
   * of the app's palette. */
  color: string;
}

/**
 * Donut with the grand total as its own hero figure in the center —
 * legend below carries identity (color + label) since it's never safe to
 * rely on hue alone, per the dataviz skill's >=2-series rule. A thin
 * surface-color ring between segments (stroke = var(--card)) stands in
 * for a border without adding data-weight ink.
 */
export function SeverityMixChart({
  total,
  segments,
}: {
  total: number;
  segments: SeverityMixSegment[];
}) {
  const data = segments.map((s) => ({ name: s.label, value: s.count, color: s.color }));
  const hasData = total > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-[168px] shrink-0">
        <div className="neu-inset absolute inset-0 rounded-full bg-input" />
        <ResponsiveContainer
          width="100%"
          height="100%"
          style={{
            filter:
              "drop-shadow(5px 5px 8px rgba(0, 0, 0, 0.5)) drop-shadow(-4px -4px 7px rgba(255, 255, 255, 0.05))",
          }}
        >
          <PieChart>
            <Pie
              data={hasData ? data : [{ name: "None", value: 1, color: "var(--muted)" }]}
              dataKey="value"
              nameKey="name"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={hasData && data.length > 1 ? 3 : 0}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {(hasData ? data : [{ name: "None", value: 1, color: "var(--muted)" }]).map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Total Plotted
          </span>
          <span className="text-3xl font-semibold text-foreground">{total.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="shrink-0 font-mono tabular-nums text-foreground">
                {s.count.toLocaleString()}
                <span className="ml-1.5 text-xs text-muted-foreground">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

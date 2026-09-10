"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PostsByDayDatum } from "@/lib/queries/social-monitor-dashboard";

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };

function formatDay(dateStr: unknown): string {
  if (typeof dateStr !== "string") return "";
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

/** Post volume (bars) with flagged-for-review count (line) overlaid on
 * the same timeline, for the selected period only. */
export function ComboBarLineChart({
  data,
  height = 220,
}: {
  data: PostsByDayDatum[];
  height?: number | `${number}%`;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No posts logged this period yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={TICK_STYLE}
          stroke="var(--axis-baseline)"
          interval={Math.ceil(data.length / 8)}
        />
        <YAxis tick={TICK_STYLE} stroke="var(--axis-baseline)" allowDecimals={false} width={28} />
        <Tooltip
          labelFormatter={formatDay}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--foreground)",
            fontSize: 12,
          }}
          cursor={{ fill: "var(--accent)" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="count" name="Posts" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
        <Line
          type="monotone"
          dataKey="highlightedCount"
          name="Flagged"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 2, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

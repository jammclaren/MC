"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ActivityTrendDatum {
  date: string; // YYYY-MM-DD
  [activityLabel: string]: string | number;
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };
const LINE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Activity is free text — some reports carry a short label ("Rally"), others
// a full narrative paragraph. Recharts' own <Legend>/Tooltip don't
// truncate, so a long one blows past the chart's box and overlaps whatever
// is below it (same class of bug as the Report Log table). Truncate for
// *display* only — the raw label still drives the actual dataKey/grouping.
const MAX_LABEL_LENGTH = 28;

function truncateLabel(label: string): string {
  return label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label;
}

function formatDay(dateStr: unknown): string {
  if (typeof dateStr !== "string") return "";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "UTC" });
}

/**
 * Daily count per specific activity label (e.g. "Bombing", "Rally"), one
 * line per label — shows whether a given activity keeps recurring
 * (persisting) over the window rather than just the category-level total.
 * `activityLabels` should already be capped to a handful (see
 * TopIncidentTypesChart's data on the Intelligence Update page) — more
 * than ~5 lines on one chart stops being readable.
 */
export function ActivityTrendChart({
  data,
  activityLabels,
  height = 220,
}: {
  data: ActivityTrendDatum[];
  activityLabels: string[];
  height?: number | `${number}%`;
}) {
  if (activityLabels.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity on file yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={TICK_STYLE}
            stroke="var(--axis-baseline)"
            interval={Math.ceil(data.length / 7)}
          />
          <YAxis tick={TICK_STYLE} stroke="var(--axis-baseline)" allowDecimals={false} width={28} />
          <Tooltip
            labelFormatter={formatDay}
            formatter={(value, name) => [value, truncateLabel(String(name))]}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--foreground)",
              fontSize: 12,
            }}
          />
          {activityLabels.map((label, i) => (
            <Line
              key={label}
              type="monotone"
              dataKey={label}
              name={label}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 2, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {activityLabels.map((label, i) => (
          <div key={label} className="flex min-w-0 max-w-full items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
            />
            <span className="truncate text-muted-foreground" title={label}>
              {truncateLabel(label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

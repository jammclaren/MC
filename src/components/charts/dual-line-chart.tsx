"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface DualLineDatum {
  dayIndex: number;
  selected: number;
  compared: number;
  /** Real calendar dates, shown in the tooltip only — the x-axis itself
   * plots by day-index so two periods covering different actual dates
   * still line up point-for-point. */
  selectedDate: string;
  comparedDate: string;
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function DualLineChart({
  data,
  height = 220,
  selectedLabel = "Current Week",
  comparedLabel = "Previous Week",
}: {
  data: DualLineDatum[];
  height?: number | `${number}%`;
  selectedLabel?: string;
  comparedLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for either period yet.</p>;
  }

  // The x-axis plots by day-index (so two periods with different real
  // dates line up point-for-point), but ticks are labeled with the
  // Current Week's actual calendar date for that index.
  const dateByDayIndex = new Map(data.map((d) => [d.dayIndex, d.selectedDate]));
  const tickDateLabel = (dayIndex: number): string => {
    const date = dateByDayIndex.get(dayIndex);
    return date ? formatDate(date) : `Day ${dayIndex}`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" />
        <XAxis
          dataKey="dayIndex"
          tickFormatter={tickDateLabel}
          tick={TICK_STYLE}
          stroke="var(--axis-baseline)"
          interval={Math.ceil(data.length / 8)}
        />
        <YAxis tick={TICK_STYLE} stroke="var(--axis-baseline)" allowDecimals={false} width={28} />
        <Tooltip
          labelFormatter={(v) => tickDateLabel(v as number)}
          formatter={(value, name, item) => {
            const point = item?.payload as DualLineDatum | undefined;
            const dateLabel = point
              ? name === selectedLabel
                ? formatDate(point.selectedDate)
                : formatDate(point.comparedDate)
              : "";
            return [`${value} (${dateLabel})`, name];
          }}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--foreground)",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="selected"
          name={selectedLabel}
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="compared"
          name={comparedLabel}
          stroke="var(--chart-4)"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

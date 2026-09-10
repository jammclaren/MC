"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface GroupedBarDatum {
  label: string;
  selected: number;
  compared: number;
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };

/** Two bars per category — Selected Period vs Compared Period — same
 * category set on both, so a topic/group present in only one period
 * still shows up at zero for the other rather than shifting the axis. */
export function GroupedBarChart({
  data,
  height = 220,
  selectedLabel = "Selected Period",
  comparedLabel = "Compared Period",
}: {
  data: GroupedBarDatum[];
  height?: number | `${number}%`;
  selectedLabel?: string;
  comparedLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for either period yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          stroke="var(--axis-baseline)"
          interval={0}
          angle={-25}
          textAnchor="end"
          height={40}
        />
        <YAxis tick={TICK_STYLE} stroke="var(--axis-baseline)" allowDecimals={false} width={28} />
        <Tooltip
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
        <Bar dataKey="selected" name={selectedLabel} fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="compared" name={comparedLabel} fill="var(--chart-1)" fillOpacity={0.4} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface LabeledBarDatum {
  label: string;
  count: number;
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };

export function LabeledBarChart({
  data,
  height = 180,
  color = "var(--chart-1)",
}: {
  data: LabeledBarDatum[];
  height?: number | `${number}%`;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" />
        <XAxis dataKey="label" tick={TICK_STYLE} stroke="var(--axis-baseline)" />
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
        <Bar dataKey="count" name="Incidents" fill={color} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

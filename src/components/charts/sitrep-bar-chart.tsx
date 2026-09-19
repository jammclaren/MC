"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SitRepBarChartDatum {
  jtfName: string;
  totalStrength: number;
  criticalAssetCount: number;
  checkpointOpsTotal: number;
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 12 };

export function SitRepBarChart({ data }: { data: SitRepBarChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" />
        <XAxis dataKey="jtfName" tick={TICK_STYLE} stroke="var(--axis-baseline)" />
        <YAxis tick={TICK_STYLE} stroke="var(--axis-baseline)" allowDecimals={false} />
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
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        <Bar
          dataKey="totalStrength"
          name="Total Strength"
          fill="var(--chart-1)"
          radius={[2, 2, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
          animationBegin={0}
        />
        <Bar
          dataKey="criticalAssetCount"
          name="Critical Assets"
          fill="var(--chart-3)"
          radius={[2, 2, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
          animationBegin={120}
        />
        <Bar
          dataKey="checkpointOpsTotal"
          name="Checkpoint Ops"
          fill="var(--chart-2)"
          radius={[2, 2, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
          animationBegin={240}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

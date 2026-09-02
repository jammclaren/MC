"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface IncidentsByDayDatum {
  date: string;
  count: number;
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };

function formatDay(dateStr: unknown): string {
  if (typeof dateStr !== "string") return "";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function IncidentsByDayChart({ data }: { data: IncidentsByDayDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
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
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--foreground)",
            fontSize: 12,
          }}
          cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Incidents"
          stroke="var(--status-warning)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--status-warning)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

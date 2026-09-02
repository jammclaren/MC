"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export interface IncidentsByDayDatum {
  date: string;
  count: number;
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };
const GRADIENT_ID = "incidentsByDayFill";

function formatDay(dateStr: unknown): string {
  if (typeof dateStr !== "string") return "";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function IncidentsByDayChart({ data }: { data: IncidentsByDayDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={TICK_STYLE}
          stroke="var(--axis-baseline)"
          interval={Math.ceil(data.length / 7)}
        />
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
        <Area
          type="monotone"
          dataKey="count"
          name="Incidents"
          stroke="var(--primary)"
          strokeWidth={2}
          fill={`url(#${GRADIENT_ID})`}
          dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

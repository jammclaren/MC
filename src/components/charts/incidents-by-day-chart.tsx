"use client";

import type { TooltipProps } from "recharts";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export interface IncidentsByDayDatum {
  date: string;
  count: number;
  /** Unique incident type keywords for the day, e.g. ["Harassment", "Rally"]. */
  types: string[];
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 11 };
const GRADIENT_ID = "incidentsByDayFill";

function formatDay(dateStr: unknown): string {
  if (typeof dateStr !== "string") return "";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function ChartTooltip({
  active,
  payload,
}: TooltipProps<number, string> & { payload?: { payload: IncidentsByDayDatum }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      <div className="font-medium">{formatDay(point.date)}</div>
      <div className="mt-0.5" style={{ color: "var(--primary)" }}>
        Incidents: {point.count}
      </div>
      {point.types.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
          {point.types.map((type) => (
            <li key={type}>• {type}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function IncidentsByDayChart({
  data,
  height = 180,
}: {
  data: IncidentsByDayDatum[];
  height?: number | `${number}%`;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
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
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--accent)", strokeWidth: 1 }} />
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

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

export interface DeploymentBarChartDatum {
  jtfName: string;
  deployedToPolling: number;
  qrf: number;
}

export function DeploymentBarChart({ data }: { data: DeploymentBarChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="jtfName" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="deployedToPolling" name="Deployed to Polling" fill="#2563eb" />
        <Bar dataKey="qrf" name="QRF" fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { CmoActivityRow } from "@/lib/queries/cmo-activities";

const CmoActivityMap = dynamic(
  () => import("./cmo-activity-map").then((mod) => mod.CmoActivityMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[400px] w-full animate-pulse rounded-md border bg-muted" />
    ),
  }
);

export function CmoActivityMapLoader({ rows, canWrite }: { rows: CmoActivityRow[]; canWrite: boolean }) {
  return <CmoActivityMap rows={rows} canWrite={canWrite} />;
}

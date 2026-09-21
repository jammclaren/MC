"use client";

import dynamic from "next/dynamic";

type Phase = "idle" | "pulling" | "exploding" | "revealed";

// WebGL touches window/document at load time, same reason the Leaflet
// maps elsewhere in this app load behind a client-only dynamic import
// (see overview-incident-map-loader.tsx) — ssr:false is only valid from
// inside a Client Component boundary.
const Grenade3D = dynamic(() => import("./grenade-3d").then((mod) => mod.Grenade3D), {
  ssr: false,
  loading: () => <div className="h-40 w-40 sm:h-52 sm:w-52" />,
});

export function Grenade3DLoader({ phase, onPullPin }: { phase: Phase; onPullPin: () => void }) {
  return <Grenade3D phase={phase} onPullPin={onPullPin} />;
}

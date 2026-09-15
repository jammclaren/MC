"use client";

import { useEffect, useState } from "react";

/**
 * Ring gauge that draws in from empty on mount — same "count up" entrance
 * treatment as the other stat tiles' animated numbers. `pct` drives both
 * the ring fill and the animated percentage label.
 */
export function RadialGauge({
  pct,
  size = 118,
  radius = 50,
  strokeWidth = 10,
  color = "var(--chart-3)",
}: {
  pct: number;
  size?: number;
  radius?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [animatedPct, setAnimatedPct] = useState(() => (reduceMotion ? pct : 0));

  useEffect(() => {
    if (reduceMotion) return;
    const raf = requestAnimationFrame(() => setAnimatedPct(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct, reduceMotion]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - animatedPct / 100)}
        style={{ transition: reduceMotion ? "none" : "stroke-dashoffset 1.1s cubic-bezier(.16,.9,.28,1)" }}
      />
    </svg>
  );
}

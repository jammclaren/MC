"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up from 0 to `value` on mount — the same "count up" treatment
 * used on the deployment/incident stat tiles' entrance motion, applied to
 * a single KPI number. Jumps straight to the final value under
 * prefers-reduced-motion.
 */
export function AnimatedCounter({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }

    startRef.current = null;
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const p = Math.min(1, (now - startRef.current) / duration);
      setDisplay(Math.round(value * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

"use client";

import { useEffect, useRef, useState } from "react";

// Space left below the wrapper for <main>'s bottom padding so the shrunk
// content doesn't still leave the page tall enough to scroll.
const BOTTOM_BUFFER_PX = 40;

// Never shrink past this — if content is so tall it would need to go
// smaller, fall back to letting the page scroll rather than render
// illegibly small.
const MIN_SCALE = 0.25;

/**
 * Shrinks its children (via `transform: scale`) so the whole block fits
 * within the remaining viewport height below it, with no vertical
 * scrolling. `transform` — unlike CSS `zoom` — never changes what
 * `scrollHeight` reports for the transformed box, so the fit math here
 * can't run away the way a `zoom`-based version can on browsers that
 * report zoomed layout metrics inconsistently.
 */
export function FitToViewport({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number | undefined }>({
    scale: 1,
    height: undefined,
  });

  useEffect(() => {
    let lastScale = 1;

    function recalc() {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const availableHeight =
        window.innerHeight - outer.getBoundingClientRect().top - BOTTOM_BUFFER_PX;
      const naturalHeight = inner.scrollHeight;
      if (naturalHeight <= 0 || availableHeight <= 0) return;
      const next = Math.max(MIN_SCALE, Math.min(1, availableHeight / naturalHeight));
      if (Math.abs(next - lastScale) > 0.002) {
        lastScale = next;
        setFit({ scale: next, height: naturalHeight * next });
      }
    }

    const timeout = setTimeout(recalc, 0);
    const observer = new ResizeObserver(recalc);
    if (innerRef.current) observer.observe(innerRef.current);
    window.addEventListener("resize", recalc);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, []);

  return (
    <div ref={outerRef} style={{ height: fit.height, overflow: "hidden" }}>
      <div
        ref={innerRef}
        style={{
          transform: `scale(${fit.scale})`,
          transformOrigin: "top left",
          width: fit.scale < 1 ? `${100 / fit.scale}%` : "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

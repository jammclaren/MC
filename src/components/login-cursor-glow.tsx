"use client";

import { useEffect, useRef } from "react";

// Viewport-fraction waypoints the spotlight sweeps through on its own
// right after the page loads (the reference video's intro), before
// handing off to the live cursor position.
const PRE_ANIMATION_PATH: [number, number][] = [
  [0.08, 0.7],
  [0.3, 0.5],
  [0.15, 0.2],
  [0.42, 0.35],
  [0.2, 0.75],
];
const PRE_ANIMATION_STEP_MS = 700;

/**
 * Drives the login background's grid-glow spotlight (see
 * .login-grid-overlay-bright / .login-cursor-glow in globals.css) via
 * the --mx/--my CSS custom properties they key off of. On mount it
 * steps the spotlight through PRE_ANIMATION_PATH on its own, then, once
 * that finishes, switches over to following the real cursor. Direct
 * style writes via refs, not React state, so neither phase re-renders
 * this component. Skips straight to the centered CSS fallback under
 * prefers-reduced-motion, and the cursor-follow phase is a no-op on
 * touch devices (no mousemove), leaving the last pre-animation position.
 */
export function LoginCursorGlow() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function setPosition(x: string, y: string) {
      overlayRef.current?.style.setProperty("--mx", x);
      overlayRef.current?.style.setProperty("--my", y);
      glowRef.current?.style.setProperty("--mx", x);
      glowRef.current?.style.setProperty("--my", y);
    }

    let cancelled = false;
    let preAnimationDone = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    if (!preAnimationDone) {
      PRE_ANIMATION_PATH.forEach(([xFrac, yFrac], i) => {
        timeouts.push(
          setTimeout(() => {
            if (cancelled) return;
            setPosition(`${xFrac * 100}%`, `${yFrac * 100}%`);
            if (i === PRE_ANIMATION_PATH.length - 1) {
              timeouts.push(
                setTimeout(() => {
                  if (!cancelled) preAnimationDone = true;
                }, PRE_ANIMATION_STEP_MS)
              );
            }
          }, i * PRE_ANIMATION_STEP_MS)
        );
      });
    }

    function handleMove(event: MouseEvent) {
      if (!preAnimationDone) return;
      setPosition(`${event.clientX}px`, `${event.clientY}px`);
    }

    window.addEventListener("mousemove", handleMove);
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return (
    <>
      <div ref={overlayRef} className="login-grid-overlay-bright absolute inset-0" />
      <div ref={glowRef} className="login-cursor-glow" />
    </>
  );
}

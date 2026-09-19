"use client";

import { useEffect, useRef } from "react";

// Full reveal within this many pixels of the signature's on-screen
// center, fading out linearly to fully hidden by 2x that distance.
const REVEAL_RADIUS_PX = 70;

/**
 * Wraps a brighter copy of the "jamisal" signature (see LoginBackground)
 * and fades it in only when the cursor is near it — the base copy stays
 * unrecognizably faint at all times (see .login-signature-text), and
 * this one reveals a crisp, readable version on top of it purely by
 * proximity, no click needed. Distance is measured against this
 * element's own bounding rect rather than a shared --mx/--my (unlike
 * LoginCursorGlow's viewport-spanning layers), since this element is a
 * small box nested well inside the viewport.
 */
export function LoginSignatureReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    function handleMove(event: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
      const reveal = Math.max(0, Math.min(1, 1 - distance / REVEAL_RADIUS_PX));
      el.style.opacity = String(reveal);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <g ref={ref} className="login-signature-bright" style={{ opacity: 0 }}>
      {children}
    </g>
  );
}

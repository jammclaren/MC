import { LoginCursorGlow } from "@/components/login-cursor-glow";
import { LoginSignatureReveal } from "@/components/login-signature-reveal";
import { LoginTerrainContours } from "@/components/login-terrain-contours";

/**
 * Slow Ken Burns drift on the sign-in backdrop, with a vignette darkening
 * toward center so the card stays legible against the terrain lines, a
 * faint cyan grid whose glow follows the cursor (see LoginCursorGlow),
 * and a small cursive "jamisal" signature hidden among the contours.
 * Every animation here respects prefers-reduced-motion globally.
 */
export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <LoginTerrainContours />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.8) 100%)",
        }}
      />
      <div className="login-grid-overlay absolute inset-0" />
      <LoginCursorGlow />
      {/* "jamisal" traced along a curved path near the largest contour
          cluster so it reads as a surveyor's mark hidden in the terrain
          lines rather than a watermark sitting flatly on top of it. The
          base copy stays unrecognizably faint; a second, crisper copy
          (LoginSignatureReveal) fades in only when the cursor is right
          on it. */}
      <svg
        className="login-signature pointer-events-none absolute bottom-[16%] left-[10%] h-14 w-32 sm:h-16 sm:w-36"
        viewBox="0 0 260 130"
        aria-hidden="true"
      >
        <defs>
          <path id="jamisal-contour-path" d="M6,102 C38,52 68,112 118,70 C158,36 188,82 254,40" fill="none" />
        </defs>
        <text className="login-signature-text">
          <textPath href="#jamisal-contour-path" startOffset="2">
            jamisal
          </textPath>
        </text>
        <LoginSignatureReveal>
          <text className="login-signature-text-bright">
            <textPath href="#jamisal-contour-path" startOffset="2">
              jamisal
            </textPath>
          </text>
        </LoginSignatureReveal>
      </svg>
    </div>
  );
}

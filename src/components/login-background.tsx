import Image from "next/image";
import { LoginCursorGlow } from "@/components/login-cursor-glow";

/**
 * Slow Ken Burns drift on the sign-in photo, with a vignette darkening
 * toward center so the card stays legible against a busy image, a faint
 * cyan grid whose glow follows the cursor (see LoginCursorGlow), and a
 * small cursive "jamisal" signature woven in as if it were part of the
 * vine. Every animation here respects prefers-reduced-motion globally.
 */
export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src="/images/login-bg.webp"
        alt=""
        fill
        priority
        unoptimized
        className="login-bg-photo object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(6,10,8,0.35) 0%, rgba(6,10,8,0.65) 60%, rgba(6,10,8,0.92) 100%)",
        }}
      />
      <div className="login-grid-overlay absolute inset-0" />
      <LoginCursorGlow />
      {/* "jamisal" traced along a curved path so it reads as a tendril
          growing through the vine rather than a flat label sitting on top
          of it — mix-blend-mode lets the underlying photo's own light/dark
          tones show through the letters instead of covering them. */}
      <svg
        className="login-signature pointer-events-none absolute bottom-[8%] left-[2%] h-32 w-72 sm:h-36 sm:w-80"
        viewBox="0 0 300 140"
        aria-hidden="true"
      >
        <defs>
          <path id="jamisal-vine-path" d="M8,118 C48,58 88,128 148,78 C198,36 232,92 292,42" fill="none" />
        </defs>
        <text className="login-signature-text">
          <textPath href="#jamisal-vine-path" startOffset="2">
            jamisal
          </textPath>
        </text>
      </svg>
    </div>
  );
}

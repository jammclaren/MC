import Image from "next/image";
import { LoginCursorGlow } from "@/components/login-cursor-glow";
import { LoginSignatureReveal } from "@/components/login-signature-reveal";

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
      {/* "jamisal" traced along a curved path through the vine ball itself
          (not the plain background below it) so it reads as a tendril
          growing out of the actual vines — the stroke behind the fill
          gives the letterforms a twisted, rope-like thickness closer to
          the vine's own strands, and mix-blend-mode lets the photo's own
          light/dark tones show through instead of sitting flatly on top
          of it. The base copy stays unrecognizably faint; a second,
          crisper copy (LoginSignatureReveal) fades in only when the
          cursor is right on it. */}
      <svg
        className="login-signature pointer-events-none absolute bottom-[24%] left-[26%] h-14 w-32 sm:h-16 sm:w-36"
        viewBox="0 0 260 130"
        aria-hidden="true"
      >
        <defs>
          <path id="jamisal-vine-path" d="M6,102 C38,52 68,112 118,70 C158,36 188,82 254,40" fill="none" />
        </defs>
        <text className="login-signature-text">
          <textPath href="#jamisal-vine-path" startOffset="2">
            jamisal
          </textPath>
        </text>
        <LoginSignatureReveal>
          <text className="login-signature-text-bright">
            <textPath href="#jamisal-vine-path" startOffset="2">
              jamisal
            </textPath>
          </text>
        </LoginSignatureReveal>
      </svg>
    </div>
  );
}

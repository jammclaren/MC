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
      <span className="login-signature absolute bottom-[18%] left-[8%] text-3xl sm:text-4xl">
        jamisal
      </span>
    </div>
  );
}

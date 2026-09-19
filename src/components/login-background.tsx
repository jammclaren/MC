import Image from "next/image";

/**
 * Slow Ken Burns drift on the sign-in photo, with a vignette darkening
 * toward center so the card stays legible against a busy image. Pure CSS
 * (no client JS needed) — the animation is defined in globals.css
 * (.login-bg-photo) so it still respects prefers-reduced-motion globally.
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
    </div>
  );
}

"use client";

import { useRef, useState, type ReactNode } from "react";

type Phase = "idle" | "pulling" | "exploding" | "revealed";

const PULL_DURATION_MS = 420;
const EXPLODE_DURATION_MS = 650;
const PARTICLE_COUNT = 18;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Particle {
  tx: number;
  ty: number;
  rot: number;
  delay: number;
  size: number;
  color: string;
}

const PARTICLE_COLORS = ["#fff4d6", "#fab219", "#d95926", "#d03b3b"];

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const dist = 60 + Math.random() * 100;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      rot: (Math.random() - 0.5) * 420,
      delay: Math.random() * 70,
      size: 3 + Math.random() * 5,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    };
  });
}

// Lazy useState initializer, not useMemo — the particle layout is a
// one-time random roll for this mount, not a derived value that needs to
// stay pure across re-renders.
function useExplosionParticles(): Particle[] {
  const [particles] = useState(generateParticles);
  return particles;
}

/** Precomputed vertical rib positions on the body ellipse (cx=80 cy=140
 * rx=52 ry=66) — each rib is a straight vertical line from the ellipse's
 * top boundary to its bottom boundary at that x offset, which is what
 * actually reads as a ribbed/segmented "pineapple" grenade casing instead
 * of a flat repeating pattern. */
const BODY_RX = 52;
const BODY_RY = 66;
const BODY_CX = 80;
const BODY_CY = 140;
function ribBounds(dx: number) {
  const half = BODY_RY * Math.sqrt(1 - (dx / BODY_RX) ** 2);
  return { x: BODY_CX + dx, top: BODY_CY - half, bottom: BODY_CY + half };
}
const RIBS = [-38, -27, -16, -5.5, 5.5, 16, 27, 38].map(ribBounds);

function ringBounds(dy: number) {
  const half = BODY_RX * Math.sqrt(1 - (dy / BODY_RY) ** 2);
  return { y: BODY_CY + dy, x1: BODY_CX - half, x2: BODY_CX + half };
}
const RINGS = [-42, -22, 22, 42].map(ringBounds);

/** A realistic-leaning M67-style fragmentation grenade — layered metal
 * gradients, embossed ribbing (grooved + highlight line pairs) instead of
 * a flat hatch fill, a brushed-steel fuze assembly, and a brass pull
 * ring/pin. The pull ring is the interactive control; the safety lever
 * ("spoon") springs off a beat after the pin does, matching how the two
 * actually separate. */
function GrenadeIllustration({ phase, onPullPin }: { phase: Phase; onPullPin: () => void }) {
  const shaking = phase === "pulling";
  const vanishing = phase === "exploding";
  return (
    <div
      className={`grenade-idle-bob relative ${shaking ? "grenade-body-shake" : ""} ${
        vanishing ? "grenade-body-vanish" : ""
      }`}
    >
      <svg
        viewBox="0 0 160 220"
        className="h-40 w-auto drop-shadow-[0_10px_22px_rgba(0,0,0,0.6)] sm:h-52"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="grenade-body-metal" x1="15%" y1="10%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#767f63" />
            <stop offset="35%" stopColor="#525a44" />
            <stop offset="70%" stopColor="#383f2e" />
            <stop offset="100%" stopColor="#23281c" />
          </linearGradient>
          <radialGradient id="grenade-body-sheen" cx="34%" cy="26%" r="42%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grenade-base-shadow" cx="50%" cy="20%" r="80%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="grenade-steel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9aa093" />
            <stop offset="55%" stopColor="#6d7565" />
            <stop offset="100%" stopColor="#454b3c" />
          </linearGradient>
          <linearGradient id="grenade-lever-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d7dbce" />
            <stop offset="50%" stopColor="#a3a996" />
            <stop offset="100%" stopColor="#787f6c" />
          </linearGradient>
          <linearGradient id="grenade-brass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f6df9c" />
            <stop offset="45%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#8a6c14" />
          </linearGradient>
          <radialGradient id="grenade-ground-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* contact shadow on the ground plane */}
        <ellipse cx="80" cy="212" rx="42" ry="9" fill="url(#grenade-ground-shadow)" />

        {/* body — layered metal gradient, not a flat fill */}
        <ellipse
          cx={BODY_CX}
          cy={BODY_CY}
          rx={BODY_RX}
          ry={BODY_RY}
          fill="url(#grenade-body-metal)"
          stroke="#1a1e14"
          strokeWidth="2"
        />

        {/* embossed ribbing — dark groove + light highlight pairs read as
            3D segmentation far better than a repeating pattern fill */}
        {RIBS.map((r, i) => (
          <g key={`rib-${i}`}>
            <line x1={r.x} y1={r.top} x2={r.x} y2={r.bottom} stroke="#161a10" strokeWidth="1.4" opacity="0.55" />
            <line
              x1={r.x + 1.1}
              y1={r.top + 2}
              x2={r.x + 1.1}
              y2={r.bottom - 2}
              stroke="#9aa38a"
              strokeWidth="0.9"
              opacity="0.3"
            />
          </g>
        ))}
        {RINGS.map((r, i) => (
          <g key={`ring-${i}`}>
            <path d={`M${r.x1},${r.y} Q80,${r.y + 3.5} ${r.x2},${r.y}`} stroke="#161a10" strokeWidth="1.4" fill="none" opacity="0.5" />
            <path
              d={`M${r.x1},${r.y - 1.4} Q80,${r.y + 2} ${r.x2},${r.y - 1.4}`}
              stroke="#9aa38a"
              strokeWidth="0.9"
              fill="none"
              opacity="0.28"
            />
          </g>
        ))}

        {/* specular sheen + base ambient occlusion, layered above the ribs */}
        <ellipse cx={BODY_CX} cy={BODY_CY} rx={BODY_RX} ry={BODY_RY} fill="url(#grenade-body-sheen)" />
        <ellipse cx={BODY_CX} cy={188} rx={BODY_RX * 0.9} ry={22} fill="url(#grenade-base-shadow)" />
        <ellipse cx={BODY_CX} cy={BODY_CY} rx={BODY_RX} ry={BODY_RY} fill="none" stroke="#0e100a" strokeWidth="1" opacity="0.4" />

        {/* base plug */}
        <ellipse cx="80" cy="203" rx="26" ry="7" fill="#20241a" stroke="#12140d" strokeWidth="1.2" />

        {/* neck */}
        <rect x="65" y="62" width="30" height="36" rx="3" fill="url(#grenade-steel)" stroke="#1a1e14" strokeWidth="1.5" />
        <line x1="65" y1="75" x2="95" y2="75" stroke="#1a1e14" strokeWidth="1.3" opacity="0.7" />
        <line x1="65" y1="87" x2="95" y2="87" stroke="#1a1e14" strokeWidth="1.3" opacity="0.7" />
        <line x1="68" y1="65" x2="68" y2="96" stroke="#e4e7da" strokeWidth="1" opacity="0.25" />

        {/* fuze assembly cap */}
        <rect x="58" y="44" width="44" height="20" rx="4" fill="url(#grenade-steel)" stroke="#1a1e14" strokeWidth="1.5" />
        <circle cx="64" cy="54" r="1.6" fill="#22261a" />
        <circle cx="96" cy="54" r="1.6" fill="#22261a" />

        {/* lever / spoon — spring steel, flips off after the pin */}
        <g
          className={phase === "pulling" || phase === "exploding" ? "grenade-lever-flip" : ""}
          style={{ transformOrigin: "96px 50px" }}
        >
          <path
            d="M94,47 C124,53 130,93 111,133"
            stroke="#20241a"
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M94,47 C124,53 130,93 111,133"
            stroke="url(#grenade-lever-metal)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M96,49 C118,55 123,88 108,124"
            stroke="#f2f4ea"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />
        </g>

        {/* pin + ring — the interactive control, brass */}
        <g
          className={phase === "pulling" || phase === "exploding" ? "grenade-pin-pull" : ""}
          style={{ transformOrigin: "100px 46px" }}
        >
          <line x1="100" y1="46" x2="127" y2="37" stroke="url(#grenade-brass)" strokeWidth="5" strokeLinecap="round" />
          <line x1="100" y1="46" x2="127" y2="37" stroke="#3d2f0a" strokeWidth="5" strokeLinecap="round" opacity="0.15" />
          <g className={phase === "idle" ? "grenade-ring-pulse" : ""}>
            <circle cx="137" cy="33" r="13" fill="none" stroke="url(#grenade-brass)" strokeWidth="5" />
          </g>
        </g>
      </svg>

      {phase === "idle" && (
        <button
          type="button"
          onClick={onPullPin}
          aria-label="Pull the pin to sign in"
          className="absolute top-0 right-0 size-14 -translate-y-2 translate-x-2 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:size-16"
        />
      )}
    </div>
  );
}

function ExplosionEffect() {
  const particles = useExplosionParticles();
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="grenade-screen-bloom absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,178,25,0.28)_0%,rgba(208,59,59,0.12)_35%,transparent_70%)]" />
      <div
        className="grenade-explosion-flash absolute size-40 rounded-full sm:size-52"
        style={{
          background:
            "radial-gradient(circle, #fff8e6 0%, #fab219 35%, #d95926 60%, rgba(208,59,59,0) 78%)",
        }}
      />
      {particles.map((p, i) => (
        <span
          key={i}
          className="grenade-particle absolute rounded-[1px]"
          style={
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--prot": `${p.rot}deg`,
              "--pdelay": `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * Gates the sign-in card behind a grenade: pull the pin, it shakes, then
 * lights off in a burst that hands off directly to the card fading in
 * where the grenade was. A near-opaque darkness layer hides the photo
 * background until that same burst — the explosion is what reveals the
 * scene, not just the card, mirroring the reference "lamp turns on and
 * lights up the room" beat.
 */
export function GrenadeLoginGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  function handlePullPin() {
    if (phase !== "idle") return;
    const reduced = prefersReducedMotion();
    const pullMs = reduced ? 60 : PULL_DURATION_MS;
    const explodeMs = reduced ? 60 : EXPLODE_DURATION_MS;

    setPhase("pulling");
    timeouts.current.push(
      setTimeout(() => {
        setPhase("exploding");
        timeouts.current.push(setTimeout(() => setPhase("revealed"), explodeMs));
      }, pullMs)
    );
  }

  const backgroundRevealed = phase === "exploding" || phase === "revealed";

  return (
    <>
      {/* Darkness over the terrain background — fully opaque (no alpha
          leak) until the pin's actually pulled, so nothing of the scene
          is visible early, then lifts once the grenade goes off, same as
          the reference video's dark-room-until-lamp-lights beat. Fixed to
          the viewport so it covers LoginBackground regardless of where
          this gate sits in the centered layout. */}
      <div
        className="grenade-darkness pointer-events-none fixed inset-0"
        style={{
          opacity: backgroundRevealed ? 0 : 1,
          background: "radial-gradient(circle at 50% 42%, #050503 0%, #010100 60%, #000000 100%)",
        }}
      />

      {phase === "revealed" ? (
        <div className="grenade-reveal-in flex items-center justify-center">{children}</div>
      ) : (
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative">
            <GrenadeIllustration phase={phase} onPullPin={handlePullPin} />
            {phase === "exploding" && <ExplosionEffect />}
          </div>
          <p className="grenade-prompt-blink font-display text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            {phase === "idle" ? "Pull the pin" : ""}
          </p>
        </div>
      )}
    </>
  );
}

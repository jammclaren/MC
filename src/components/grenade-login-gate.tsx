"use client";

import { useRef, useState, type ReactNode } from "react";
import { Grenade3DLoader } from "@/components/grenade-3d-loader";

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
            <Grenade3DLoader phase={phase} onPullPin={handlePullPin} />
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

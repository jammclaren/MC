"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

type Phase = "idle" | "pulling" | "exploding" | "revealed";

// Kept in step with the CSS timings this replaced (see globals.css
// grenade-pin-pull/grenade-body-vanish) so the pull->explode handoff to
// GrenadeLoginGate's timers still lines up with what's on screen.
const PULL_DURATION_S = 0.42;
const EXPLODE_SHRINK_S = 0.3;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Four evenly-spaced latitude rings on the unit sphere; radius at each is
// just the sphere's cross-section radius there (sqrt(1 - y^2)), nudged out
// slightly (*1.015) so the ring sits proud of the body surface instead of
// clipping into it.
const RIB_COUNT = 8;
const RING_YS = [-0.58, -0.26, 0.26, 0.58];
function ringRadiusAt(y: number): number {
  return Math.sqrt(Math.max(0, 1 - y * y)) * 1.015;
}

/** The grenade itself — a faceted (low-poly icosahedron) metal body reads
 * as the segmented "pineapple" casing without needing a texture, lit with
 * a real key/fill light pair plus an HDRI environment for the specular
 * highlights a flat SVG gradient could only fake. Pin/lever/body motion is
 * driven by `phase` directly in the render loop rather than a spring
 * library — durations mirror the CSS keyframes this replaced. */
function GrenadeMesh({ phase }: { phase: Phase }) {
  const bodyGroup = useRef<THREE.Group>(null);
  const pinGroup = useRef<THREE.Group>(null);
  const leverGroup = useRef<THREE.Group>(null);
  const bodyMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const pinMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const leverMaterial = useRef<THREE.MeshStandardMaterial>(null);

  const clock = useRef(0);
  const phaseStart = useRef(0);
  const prevPhase = useRef<Phase>(phase);

  // One vertical meridian arc, built once and reused for all 8 ribs by
  // just rotating the mesh around Y — same "pineapple" grid the old SVG
  // drew with RIBS/RINGS lines (see the version this replaced), now real
  // embossed geometry that catches the key light instead of a flat pair
  // of groove/highlight strokes.
  const ribGeometry = useMemo(() => {
    const steps = 12;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const phi = (-66 + (132 * i) / steps) * (Math.PI / 180);
      points.push(new THREE.Vector3(Math.cos(phi) * 1.015, Math.sin(phi) * 1.015, 0));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 24, 0.026, 6, false);
  }, []);

  useFrame((_, delta) => {
    clock.current += delta;
    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      phaseStart.current = clock.current;
    }
    const elapsed = clock.current - phaseStart.current;
    const body = bodyGroup.current;
    const pin = pinGroup.current;
    const lever = leverGroup.current;

    if (phase === "idle" && body) {
      body.rotation.y += delta * 0.25;
      body.position.x = 0;
    }

    if (phase === "pulling") {
      const t = easeOutCubic(Math.min(elapsed / PULL_DURATION_S, 1));
      if (pin) {
        pin.position.set(t * 0.9, t * 0.55, 0);
        pin.rotation.z = t * 0.9;
      }
      if (pinMaterial.current) pinMaterial.current.opacity = 1 - t;

      const lt = easeOutCubic(Math.min(Math.max(elapsed - 0.08, 0) / PULL_DURATION_S, 1));
      if (lever) {
        lever.rotation.z = lt * 0.85;
        lever.position.set(lt * 0.45, lt * 0.28, 0);
      }
      if (leverMaterial.current) leverMaterial.current.opacity = 1 - lt;

      // rattles right before the explosion, same beat as the old
      // grenade-body-shake keyframe (starts ~0.3s into the pull).
      if (body) {
        body.position.x = elapsed > 0.28 ? Math.sin(clock.current * 90) * 0.02 : 0;
      }
    }

    if (phase === "exploding" && body && bodyMaterial.current) {
      const t = Math.min(elapsed / EXPLODE_SHRINK_S, 1);
      body.scale.setScalar(1 - t * 0.4);
      body.position.x = 0;
      bodyMaterial.current.opacity = 1 - t;
    }
  });

  return (
    <group ref={bodyGroup} position={[0, -0.35, 0]} scale={0.62}>
      {/* body — faceted casing plus embossed vertical ribs, horizontal
          rings, and a base plug, the real-geometry equivalent of the old
          SVG's rib/ring line pairs */}
      <group scale={[1, 1.28, 1]}>
        <mesh castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial ref={bodyMaterial} color="#454b3c" metalness={0.55} roughness={0.45} transparent />
        </mesh>

        {Array.from({ length: RIB_COUNT }).map((_, i) => (
          <mesh key={i} geometry={ribGeometry} rotation={[0, (i * Math.PI * 2) / RIB_COUNT, 0]} castShadow>
            <meshStandardMaterial color="#606a52" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}

        {RING_YS.map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[ringRadiusAt(y), 0.022, 6, 40]} />
            <meshStandardMaterial color="#606a52" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}

        {/* base plug */}
        <mesh position={[0, -0.97, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.4, 0.08, 20]} />
          <meshStandardMaterial color="#20241a" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>

      {/* neck */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.34, 0.55, 16]} />
        <meshStandardMaterial color="#6d7565" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* fuze assembly cap */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.28, 16]} />
        <meshStandardMaterial color="#828a71" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* lever / spoon — spring steel, flips off a beat after the pin */}
      <group ref={leverGroup} position={[0.46, 1.95, 0]}>
        <mesh rotation={[0, 0, -0.5]} position={[0.35, 0.2, 0]} castShadow>
          <capsuleGeometry args={[0.07, 1.1, 4, 8]} />
          <meshStandardMaterial ref={leverMaterial} color="#a3a996" metalness={0.7} roughness={0.28} transparent />
        </mesh>
      </group>

      {/* pin + ring — brass, the interactive control */}
      <group ref={pinGroup} position={[0.5, 1.95, 0]}>
        <mesh rotation={[0, 0, -0.9]} position={[0.22, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.55, 8]} />
          <meshStandardMaterial ref={pinMaterial} color="#c9a227" metalness={0.85} roughness={0.25} transparent />
        </mesh>
        <mesh position={[0.55, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.16, 0.035, 12, 24]} />
          <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/** Client-only 3D replacement for the old flat SVG grenade — same phase
 * contract (idle/pulling/exploding/revealed) as GrenadeLoginGate expects,
 * same "Pull the pin" accessible control, just a real lit WebGL mesh
 * instead of gradient-shaded paths. The DOM-based ExplosionEffect overlay
 * in grenade-login-gate.tsx is unchanged and still plays on top of this. */
export function Grenade3D({ phase, onPullPin }: { phase: Phase; onPullPin: () => void }) {
  return (
    <div className="grenade-idle-bob relative h-40 w-40 sm:h-52 sm:w-52">
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 30 }}
        shadows="basic"
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "default" }}
      >
        {/* Plain lights only — no HDRI Environment. drei's Environment
            builds a PMREM cubemap on mount, which reliably lost the
            WebGL context on this sandbox's software WebKit renderer
            ("THREE.WebGLRenderer: Context Lost" — the grenade never
            painted at all). Fill/rim lights below stand in for the
            reflections it would have added. */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
        <pointLight position={[-3, 1, 2]} intensity={0.6} color="#fab219" />
        <pointLight position={[2, -1, 3]} intensity={0.35} color="#cfe8ff" />
        <GrenadeMesh phase={phase} />
        <ContactShadows position={[0, -1.35, 0]} opacity={0.55} scale={5} blur={2.4} far={2} />
      </Canvas>
      {phase === "idle" && (
        <button
          type="button"
          onClick={onPullPin}
          aria-label="Pull the pin to sign in"
          className="absolute top-2 right-2 size-14 -translate-y-2 translate-x-2 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:size-16"
        />
      )}
    </div>
  );
}

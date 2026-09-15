"use client";

import { useEffect, useRef } from "react";

/** Deterministic value-noise (no deps) — same lattice each reload, only
 * the animation phase changes, so the field never "jumps" between visits. */
function makeNoise(seed: number) {
  const perm = new Uint8Array(256);
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const grad = (hash: number, x: number, y: number) => {
    const h4 = hash & 3;
    const u = h4 < 2 ? x : y;
    const v = h4 < 2 ? y : x;
    return (h4 & 1 ? -u : u) + (h4 & 2 ? -2 * v : 2 * v);
  };

  return (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const a = p[X] + Y;
    const b = p[X + 1] + Y;
    return lerp(
      lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
      lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
      v
    );
  };
}

const BANDS = 11;
const STEP = 6;

/**
 * Topographic isoline field for the sign-in screen — a synthetic elevation
 * grid, contoured at fixed bands via marching squares. Reads as a
 * sensor/topo scan behind the card rather than decoration. Renders one
 * static frame under `prefers-reduced-motion`.
 */
export function TerrainContourBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const n1 = makeNoise(7);
    const n2 = makeNoise(91);
    const heightAt = (x: number, y: number, t: number) => {
      const nx = x * 0.006;
      const ny = y * 0.006;
      return n1(nx + t * 0.02, ny) * 0.65 + n2(nx * 2.3 - t * 0.015, ny * 2.3) * 0.35;
    };

    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#22d3ee";

    let w = 0;
    let h = 0;
    let dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function drawFrame(t: number) {
      ctx!.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / STEP) + 1;
      const rows = Math.ceil(h / STEP) + 1;
      const grid = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          grid[j * cols + i] = heightAt(i * STEP, j * STEP, t);
        }
      }
      for (let bandIdx = 0; bandIdx < BANDS; bandIdx++) {
        const level = -0.9 + (bandIdx / (BANDS - 1)) * 1.8;
        const emphasis = bandIdx === Math.floor(((Math.sin(t * 0.09) + 1) / 2) * (BANDS - 1));
        ctx!.beginPath();
        ctx!.strokeStyle = emphasis ? primary : `rgba(34,211,238,${0.05 + 0.05 * (bandIdx % 2)})`;
        ctx!.lineWidth = emphasis ? 1.1 : 0.7;
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const v0 = grid[j * cols + i];
            const v1 = grid[j * cols + i + 1];
            const v2 = grid[(j + 1) * cols + i + 1];
            const v3 = grid[(j + 1) * cols + i];
            const x0 = i * STEP;
            const y0 = j * STEP;
            const x1 = (i + 1) * STEP;
            const y1 = (j + 1) * STEP;
            const pts: [number, number][] = [];
            const edge = (va: number, vb: number, ax: number, ay: number, bx: number, by: number) => {
              if (va < level !== vb < level) {
                const tt = (level - va) / (vb - va);
                pts.push([ax + (bx - ax) * tt, ay + (by - ay) * tt]);
              }
            };
            edge(v0, v1, x0, y0, x1, y0);
            edge(v1, v2, x1, y0, x1, y1);
            edge(v2, v3, x1, y1, x0, y1);
            edge(v3, v0, x0, y1, x0, y0);
            if (pts.length >= 2) {
              ctx!.moveTo(pts[0][0], pts[0][1]);
              ctx!.lineTo(pts[1][0], pts[1][1]);
            }
          }
        }
        ctx!.stroke();
      }

      const sweepY = ((t * 22) % (h + 60)) - 30;
      const grad = ctx!.createLinearGradient(0, sweepY - 18, 0, sweepY + 18);
      grad.addColorStop(0, "rgba(34,211,238,0)");
      grad.addColorStop(0.5, "rgba(34,211,238,0.05)");
      grad.addColorStop(1, "rgba(34,211,238,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, sweepY - 18, w, 36);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      drawFrame(0);
      return () => window.removeEventListener("resize", resize);
    }

    let raf = 0;
    let start: number | null = null;
    function loop(ts: number) {
      if (start === null) start = ts;
      drawFrame((ts - start) / 1000);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(9,13,14,0) 0%, rgba(9,13,14,0.55) 68%, rgba(9,13,14,0.92) 100%)",
        }}
      />
    </div>
  );
}

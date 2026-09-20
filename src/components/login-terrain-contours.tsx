/**
 * Dark topographic backdrop for the sign-in screen — black base, dense
 * flowing elevation-contour lines rendered with an actual marching-squares
 * pass over a deterministic sine-based height field (not isolated circles;
 * lines merge, split, and nest the way a real topo map's do), colored on
 * a low-to-high gold gradient, plus a bright "survey light" comet that
 * continuously travels around a few of the largest contour loops. The
 * height field and every derived path are pure functions of fixed
 * constants — no randomness — so server and client render identical
 * markup with no hydration mismatch, and the (mildly expensive) marching
 * squares pass runs once at module load, not per request.
 */

const VIEW = 1000;
const GRID = 100;
const LEVELS = 8;
const HEIGHT_MIN = -1.6;
const HEIGHT_MAX = 1.6;
const MIN_CHAIN_LENGTH = 55;

// Sum of a handful of sine/cosine waves, some nested inside others' phase
// terms ("domain warping") — a cheap deterministic stand-in for Perlin
// noise that still produces organic, non-repeating-looking terrain.
function heightAt(nx: number, ny: number): number {
  const x = nx * 5.5;
  const y = ny * 5.5;
  return (
    Math.sin(x * 1.6 + Math.sin(y * 1.3 + 0.6) * 2.0) * 0.5 +
    Math.sin(y * 1.4 + Math.cos(x * 1.1 - 0.4) * 1.8) * 0.45 +
    Math.sin((x + y) * 0.9 + 1.3) * 0.3 +
    Math.sin((x - y) * 1.1 - 0.8) * 0.28 +
    Math.sin(x * 2.6 - y * 0.7 + 2.1) * 0.12 +
    Math.cos(y * 2.3 + x * 0.5 - 1.5) * 0.12
  );
}

type Point = [number, number];
interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function buildHeightGrid(): number[][] {
  const grid: number[][] = [];
  for (let j = 0; j <= GRID; j++) {
    const row: number[] = [];
    for (let i = 0; i <= GRID; i++) {
      row.push(heightAt(i / GRID, j / GRID));
    }
    grid.push(row);
  }
  return grid;
}

// Standard 16-case marching squares over the shared height grid, at one
// threshold. Each returned segment's endpoints are linearly interpolated
// along a grid edge — two cells sharing an edge compute the identical
// value there, so exact-key matching in chainSegments below is safe.
function marchingSquares(grid: number[][], threshold: number): Segment[] {
  const segments: Segment[] = [];
  const cell = VIEW / GRID;
  const lerp = (a: number, b: number, va: number, vb: number) => a + (b - a) * ((threshold - va) / (vb - va));

  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const tl = grid[j][i];
      const tr = grid[j][i + 1];
      const br = grid[j + 1][i + 1];
      const bl = grid[j + 1][i];
      let idx = 0;
      if (tl > threshold) idx |= 8;
      if (tr > threshold) idx |= 4;
      if (br > threshold) idx |= 2;
      if (bl > threshold) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      const x0 = i * cell;
      const y0 = j * cell;
      const x1 = x0 + cell;
      const y1 = y0 + cell;
      const top: Point = [lerp(x0, x1, tl, tr), y0];
      const right: Point = [x1, lerp(y0, y1, tr, br)];
      const bottom: Point = [lerp(x0, x1, bl, br), y1];
      const left: Point = [x0, lerp(y0, y1, tl, bl)];
      const add = (a: Point, b: Point) => segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });

      switch (idx) {
        case 1:
          add(left, bottom);
          break;
        case 2:
          add(bottom, right);
          break;
        case 3:
          add(left, right);
          break;
        case 4:
          add(top, right);
          break;
        case 5:
          add(left, top);
          add(bottom, right);
          break;
        case 6:
          add(top, bottom);
          break;
        case 7:
          add(left, top);
          break;
        case 8:
          add(top, left);
          break;
        case 9:
          add(top, bottom);
          break;
        case 10:
          add(top, right);
          add(left, bottom);
          break;
        case 11:
          add(top, right);
          break;
        case 12:
          add(left, right);
          break;
        case 13:
          add(bottom, right);
          break;
        case 14:
          add(left, bottom);
          break;
      }
    }
  }
  return segments;
}

const keyOf = (p: Point) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;

// Reconnects the unordered segment soup from marchingSquares back into
// continuous polylines (closed loops where a contour doesn't hit the grid
// edge, open chains where it does) by walking shared endpoints.
function chainSegments(segments: Segment[]): Point[][] {
  const pointSegs = new Map<string, number[]>();
  segments.forEach((seg, idx) => {
    for (const k of [keyOf([seg.x1, seg.y1]), keyOf([seg.x2, seg.y2])]) {
      const list = pointSegs.get(k);
      if (list) list.push(idx);
      else pointSegs.set(k, [idx]);
    }
  });

  const used = new Array(segments.length).fill(false);
  const chains: Point[][] = [];

  const extend = (chain: Point[], fromEnd: boolean) => {
    let growing = true;
    while (growing) {
      growing = false;
      const tip = fromEnd ? chain[chain.length - 1] : chain[0];
      const k = keyOf(tip);
      for (const idx of pointSegs.get(k) ?? []) {
        if (used[idx]) continue;
        const s = segments[idx];
        const p1: Point = [s.x1, s.y1];
        const p2: Point = [s.x2, s.y2];
        const next = keyOf(p1) === k ? p2 : keyOf(p2) === k ? p1 : null;
        if (!next) continue;
        used[idx] = true;
        if (fromEnd) chain.push(next);
        else chain.unshift(next);
        growing = true;
        break;
      }
    }
  };

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const s = segments[i];
    const chain: Point[] = [
      [s.x1, s.y1],
      [s.x2, s.y2],
    ];
    extend(chain, true);
    extend(chain, false);
    if (chain.length >= 3) chains.push(chain);
  }
  return chains;
}

function chainToPath(chain: Point[]): string {
  return chain.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}

function chainLength(chain: Point[]): number {
  let total = 0;
  for (let i = 1; i < chain.length; i++) {
    total += Math.hypot(chain[i][0] - chain[i - 1][0], chain[i][1] - chain[i - 1][1]);
  }
  return total;
}

function isClosed(chain: Point[]): boolean {
  return keyOf(chain[0]) === keyOf(chain[chain.length - 1]);
}

function centroidOf(chain: Point[]): Point {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of chain) {
    sx += x;
    sy += y;
  }
  return [sx / chain.length, sy / chain.length];
}

const GOLD_LOW = "#8a6118";
const GOLD_HIGH = "#fff3c4";

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

interface RenderedChain {
  d: string;
  color: string;
  length: number;
  closed: boolean;
  centroid: Point;
}

interface Runlight {
  d: string;
  duration: number;
  delay: number;
}

interface TerrainData {
  chains: RenderedChain[];
  runlights: Runlight[];
}

// Computed once at module load (deterministic, no randomness) rather than
// per render — marching squares over a 100x100 grid at a handful of
// levels is cheap but there's no reason to redo it on every request.
function buildTerrain(): TerrainData {
  const grid = buildHeightGrid();
  const chains: RenderedChain[] = [];

  for (let level = 0; level < LEVELS; level++) {
    const t = level / (LEVELS - 1);
    const threshold = HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * t;
    const color = lerpHex(GOLD_LOW, GOLD_HIGH, t);
    const segs = marchingSquares(grid, threshold);
    for (const chain of chainSegments(segs)) {
      const length = chainLength(chain);
      // Drop tiny noise loops — a handful of long, clean lines reads as
      // a terrain map; hundreds of small scribbles reads as clutter.
      if (length < MIN_CHAIN_LENGTH) continue;
      chains.push({ d: chainToPath(chain), color, length, closed: isClosed(chain), centroid: centroidOf(chain) });
    }
  }

  // First light: the single largest closed loop overall (a clean seamless
  // loop). Second light: whichever sizeable contour sits closest to the
  // top-left corner — this terrain doesn't always happen to have a big
  // closed loop up there, so this falls back to an open chain rather
  // than requiring one, as long as it's a substantial line and not a
  // tiny stub — so the two lights land on visibly different contours in
  // different parts of the scene instead of both on the same big hill.
  const primary = chains.filter((c) => c.closed).sort((a, b) => b.length - a.length)[0];
  const topLeftCandidate = chains
    .filter((c) => c.length > 150 && c !== primary)
    .sort((a, b) => Math.hypot(...a.centroid) - Math.hypot(...b.centroid))[0];

  const runlights: Runlight[] = [];
  if (primary) runlights.push({ d: primary.d, duration: 14, delay: 0 });
  if (topLeftCandidate) runlights.push({ d: topLeftCandidate.d, duration: 11, delay: 2 });

  return { chains, runlights };
}

const TERRAIN = buildTerrain();

export function LoginTerrainContours() {
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid slice"
      className="login-bg-drift absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <rect x="0" y="0" width={VIEW} height={VIEW} fill="#040302" />
      <defs>
        <filter id="terrain-runlight-glow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="terrain-runlight-gradient" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fff8e6" />
          <stop offset="45%" stopColor="#fbd77a" />
          <stop offset="100%" stopColor="#c9911f" />
        </radialGradient>
      </defs>
      {TERRAIN.chains.map((c, i) => (
        <path key={i} d={c.d} fill="none" stroke={c.color} strokeWidth={1.15} strokeLinejoin="round" opacity={0.78} />
      ))}
      {TERRAIN.runlights.map((r, i) => (
        <circle
          key={i}
          r={5}
          fill="url(#terrain-runlight-gradient)"
          filter="url(#terrain-runlight-glow)"
          className="login-terrain-runlight"
          style={
            {
              offsetPath: `path("${r.d}")`,
              animationDuration: `${r.duration}s`,
              animationDelay: `${r.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}

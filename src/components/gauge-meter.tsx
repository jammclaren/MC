// Semi-circular meter: "a single ratio against a limit" (dataviz skill's
// choosing-a-form guidance). The fill carries severity (good/warning/
// critical); the unfilled track is a lighter step of the same neutral
// ramp, per the skill's meter spec — never a second competing hue.

const SIZE = 200;
const STROKE = 16;
const CX = SIZE / 2;
const CY = SIZE / 2 + 6;
const R = SIZE / 2 - STROKE;

function arcPoint(pct: number) {
  const angle = Math.PI * (1 - pct / 100);
  return {
    x: CX + R * Math.cos(angle),
    y: CY - R * Math.sin(angle),
  };
}

function arcPath(fromPct: number, toPct: number) {
  const start = arcPoint(fromPct);
  const end = arcPoint(toPct);
  const largeArc = toPct - fromPct > 50 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export interface GaugeMeterProps {
  /** 0–100 */
  value: number;
  label: string;
  /** Optional sub-caption under the big number, e.g. "45,000 / 120,000 voters" */
  caption?: string;
  /** Thresholds for fill color: >= good is status-good, >= warning is
   * status-warning, else status-critical. Defaults suit "more is better"
   * coverage metrics; pass inverted thresholds for "less is better" ones. */
  goodAt?: number;
  warningAt?: number;
}

export function GaugeMeter({
  value,
  label,
  caption,
  goodAt = 70,
  warningAt = 40,
}: GaugeMeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const color =
    clamped >= goodAt
      ? "var(--status-good)"
      : clamped >= warningAt
        ? "var(--status-warning)"
        : "var(--status-critical)";

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE / 2 + STROKE}`}
        width="100%"
        className="max-w-[220px]"
      >
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={arcPath(0, clamped)}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          className="font-mono text-3xl font-semibold"
          fill="var(--foreground)"
        >
          {clamped.toFixed(0)}%
        </text>
      </svg>
      <div className="-mt-2 text-center">
        <div className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {label}
        </div>
        {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
      </div>
    </div>
  );
}

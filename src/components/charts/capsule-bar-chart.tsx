export interface CapsuleBarDatum {
  label: string;
  count: number;
}

// Track width in px (matches the w-7 class below) — the thumb is sized to
// match it exactly so it always fully caps the fill's rounded top with no
// sliver of the pill peeking out past its edges, at any fill height.
const TRACK_WIDTH_PX = 28;

const TICK_COUNT = 5;

/** Fixed incident-count bands: 0-30 low, 31-50 medium, 51+ high. */
function severityColor(count: number): string {
  if (count >= 51) return "var(--status-critical)";
  if (count >= 31) return "var(--status-warning)";
  return "#facc15";
}

/** Rounds a raw max up to a "nice" round number (1/2/5 x a power of ten)
 * so the axis ticks read as clean values like 0/20/40/60 instead of
 * whatever the tallest bar happens to be. */
function niceMax(value: number): number {
  const v = Math.max(value, 1);
  const magnitude = 10 ** Math.floor(Math.log10(v));
  const residual = v / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

/**
 * Vertical neumorphic capsule bars — each category gets a fixed-height
 * inset "track" (the available range) with a shorter pill anchored to its
 * bottom for the actual value, rounded caps top and bottom. Same soft-UI
 * material as the Slider/Top Incident Types bars (see .neu-inset), just
 * oriented vertically. A minimum fill height keeps a real-but-small count
 * from rendering as an invisible sliver.
 *
 * The fill's color is a severity tier based on the bar's own raw incident
 * count (see severityColor), not its height relative to the tallest bar —
 * a JTF with 24 incidents reads as low even if every other JTF has fewer.
 *
 * A y-axis with evenly spaced numeric ticks and horizontal gridlines sits
 * to the left, same idea as a standard bar chart's value axis, using the
 * same --gridline/--axis-baseline tokens the recharts-based charts use.
 */
export function CapsuleBarChart({
  data,
  trackHeight = 140,
}: {
  data: CapsuleBarDatum[];
  trackHeight?: number;
}) {
  const rawMax = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  const scaleMax = niceMax(rawMax);
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => Math.round((scaleMax * i) / TICK_COUNT));

  return (
    <div className="flex items-start gap-2">
      <div
        className="flex flex-shrink-0 flex-col justify-between text-right font-mono text-xs text-muted-foreground"
        style={{ height: trackHeight }}
      >
        {[...ticks].reverse().map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1" style={{ height: trackHeight + 28 }}>
        {ticks.map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute inset-x-0"
            style={{
              bottom: 28 + (t / scaleMax) * trackHeight,
              borderTop: t === 0 ? "1px solid var(--axis-baseline)" : "1px dashed var(--gridline)",
            }}
          />
        ))}
        <div className="relative flex h-full items-end justify-around gap-3 px-2">
          {data.map((d) => {
            const fillPct = Math.max((d.count / scaleMax) * 100, d.count > 0 ? 4 : 0);
            return (
              <div key={d.label} className="flex flex-col items-center gap-2">
                <div
                  className="neu-inset relative w-7 rounded-full bg-input"
                  style={{ height: trackHeight }}
                  title={`${d.label}: ${d.count.toLocaleString()}`}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full transition-all"
                    style={{
                      height: `${fillPct}%`,
                      background: `linear-gradient(to bottom, color-mix(in oklch, ${severityColor(d.count)}, white 35%), ${severityColor(d.count)})`,
                    }}
                  />
                  {d.count > 0 && (
                    <span
                      className="neu-raised absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full bg-white"
                      style={{ bottom: `${fillPct}%`, width: TRACK_WIDTH_PX, height: TRACK_WIDTH_PX }}
                    />
                  )}
                </div>
                <span className="text-xs whitespace-nowrap text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

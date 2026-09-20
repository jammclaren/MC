export interface CapsuleBarDatum {
  label: string;
  count: number;
}

// Track width in px (matches the w-7 class below) — the thumb is sized to
// match it exactly so it always fully caps the fill's rounded top with no
// sliver of the pill peeking out past its edges, at any fill height.
const TRACK_WIDTH_PX = 28;

const TICK_COUNT = 5;

// Fixed incident-count bands: 0-20 low (yellow), 21-40 medium (orange),
// 41-60+ high (red) — red reaches full saturation by HIGH_BAND_END rather
// than at the axis's own top, so a bar in the high band actually reads as
// red instead of a faint tint diluted across however tall the axis grows.
const LOW_BAND_END = 20;
const MEDIUM_BAND_END = 40;
const HIGH_BAND_END = 60;

/** Builds the severity gradient anchored to the full axis scale (0 to
 * scaleMax), not to a single bar's own height, so a short/low bar only
 * ever reveals its yellow bottom slice while a bar reaching into the
 * high band reveals red near its top — same technique as a thermometer
 * fill, positioned via backgroundSize/backgroundPosition on the fill. */
function severityGradient(scaleMax: number): string {
  const lowStop = Math.min((LOW_BAND_END / scaleMax) * 100, 100);
  const medStop = Math.min((MEDIUM_BAND_END / scaleMax) * 100, 100);
  const highStop = Math.min((HIGH_BAND_END / scaleMax) * 100, 100);
  return `linear-gradient(to top, #facc15 0%, #facc15 ${lowStop}%, var(--status-warning) ${medStop}%, var(--status-critical) ${highStop}%, var(--status-critical) 100%)`;
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
 * The fill's color reads as a severity scale (see severityGradient): the
 * gradient is anchored to the full axis range rather than each bar's own
 * height, so a JTF with 24 incidents shows yellow even if every other JTF
 * has fewer, and only a count past the high threshold reveals red.
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
            // The fill must render at least as tall as the track is wide,
            // or it renders as a flat-topped pill (width > height) instead
            // of a rounded dome — and the round thumb, sized to match the
            // track width, can only fully cap a dome, not a flat top.
            const minFillPct = (TRACK_WIDTH_PX / trackHeight) * 100;
            const fillPct = Math.max((d.count / scaleMax) * 100, d.count > 0 ? minFillPct : 0);
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
                      backgroundImage: severityGradient(scaleMax),
                      backgroundSize: `100% ${trackHeight}px`,
                      backgroundPosition: "bottom",
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

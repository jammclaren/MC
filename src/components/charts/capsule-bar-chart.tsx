export interface CapsuleBarDatum {
  label: string;
  count: number;
}

// Track width in px (matches the w-7 class below) — the thumb is sized to
// match it exactly so it always fully caps the fill's rounded top with no
// sliver of the pill peeking out past its edges, at any fill height.
const TRACK_WIDTH_PX = 28;

/**
 * Vertical neumorphic capsule bars — each category gets a fixed-height
 * inset "track" (the available range) with a shorter pill anchored to its
 * bottom for the actual value, rounded caps top and bottom. Same soft-UI
 * material as the Slider/Top Incident Types bars (see .neu-inset), just
 * oriented vertically. A minimum fill height keeps a real-but-small count
 * from rendering as an invisible sliver.
 *
 * The fill's color reads as a severity scale rather than a flat brand
 * color: the gradient is anchored to the full track height (not scaled to
 * the fill's own height), so a short/low bar only reveals the yellow
 * bottom of it, a mid-height bar reaches into orange, and a bar near the
 * max reaches red.
 */
export function CapsuleBarChart({
  data,
  trackHeight = 140,
}: {
  data: CapsuleBarDatum[];
  trackHeight?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="flex items-end justify-around gap-3 px-2" style={{ height: trackHeight + 28 }}>
      {data.map((d) => {
        const fillPct = Math.max((d.count / max) * 100, d.count > 0 ? 6 : 0);
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
                  backgroundImage:
                    "linear-gradient(to top, #facc15 0%, var(--status-warning) 50%, var(--status-critical) 100%)",
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
  );
}

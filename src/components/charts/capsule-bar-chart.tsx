export interface CapsuleBarDatum {
  label: string;
  count: number;
}

// Track width in px (matches the w-7 class below) — the thumb is sized to
// match it exactly so it always fully caps the fill's rounded top with no
// sliver of the pill peeking out past its edges, at any fill height.
const TRACK_WIDTH_PX = 28;

/** Fixed incident-count bands: 0-30 low, 31-50 medium, 51+ high. */
function severityColor(count: number): string {
  if (count >= 51) return "var(--status-critical)";
  if (count >= 31) return "var(--status-warning)";
  return "#facc15";
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
    <div
      className="relative flex items-end justify-around gap-3 px-2"
      style={{ height: trackHeight + 28 }}
    >
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{ bottom: 28, borderTop: "1px solid var(--axis-baseline)" }}
      />
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
  );
}

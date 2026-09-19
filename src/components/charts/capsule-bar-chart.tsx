export interface CapsuleBarDatum {
  label: string;
  count: number;
}

/**
 * Vertical neumorphic capsule bars — each category gets a fixed-height
 * inset "track" (the available range) with a shorter teal-gradient pill
 * anchored to its bottom for the actual value, rounded caps top and
 * bottom. Same soft-UI material as the Slider/Top Incident Types bars
 * (see .neu-inset), just oriented vertically. A minimum fill height keeps
 * a real-but-small count from rendering as an invisible sliver.
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
        const fillPct = (d.count / max) * 100;
        return (
          <div key={d.label} className="flex flex-col items-center gap-2">
            <div
              className="neu-inset relative flex w-7 flex-col justify-end overflow-hidden rounded-full bg-input"
              style={{ height: trackHeight }}
              title={`${d.label}: ${d.count.toLocaleString()}`}
            >
              <div
                className="w-full rounded-full transition-all"
                style={{
                  height: `${Math.max(fillPct, d.count > 0 ? 6 : 0)}%`,
                  background: "linear-gradient(to bottom, #5eead4, var(--primary))",
                }}
              />
            </div>
            <span className="text-xs whitespace-nowrap text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

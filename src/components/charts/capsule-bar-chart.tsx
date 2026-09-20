export interface CapsuleBarDatum {
  label: string;
  count: number;
}

// Fixed incident-count bands: 0-20 low (yellow), 21-40 medium (orange),
// 41-60+ high (red).
function severityColor(count: number): string {
  if (count > 40) return "var(--status-critical)";
  if (count > 20) return "var(--status-warning)";
  return "#facc15";
}

/**
 * Horizontal neumorphic slider bars — one row per JTF. Same neumorphism
 * material as the rest of the app (.neu-inset track, .neu-raised thumb),
 * but a slimmer track with a deliberately larger, grey (bg-secondary,
 * matching the app's other raised surfaces like Button/Card) thumb —
 * the size gap alone keeps the thumb clear of the track's rounded end,
 * no per-chart size tuning needed. Fill color is a severity tier from
 * the bar's own raw count (see severityColor), not its length relative
 * to the longest bar in view.
 */
export function CapsuleBarChart({ data }: { data: CapsuleBarDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-4">
      {data.map((d) => {
        const widthPct = (d.count / max) * 100;
        const color = severityColor(d.count);
        return (
          <div key={d.label} className="flex flex-col gap-1.5">
            <span className="text-sm text-foreground">{d.label}</span>
            <div className="flex items-center gap-3">
              <div className="neu-inset relative h-1.5 min-w-0 flex-1 rounded-full bg-input">
                <div
                  className="relative h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(widthPct, 3)}%`,
                    background: `linear-gradient(to right, color-mix(in oklch, ${color}, white 35%), ${color})`,
                  }}
                >
                  <span className="neu-raised absolute top-1/2 right-0 size-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-secondary" />
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                {d.count.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

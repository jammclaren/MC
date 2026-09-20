export interface SitRepCapsuleDatum {
  jtfName: string;
  totalStrength: number;
  criticalAssetCount: number;
  checkpointOpsTotal: number;
}

const SERIES = [
  { name: "Total Strength", color: "var(--chart-1)", pick: (d: SitRepCapsuleDatum) => d.totalStrength },
  { name: "Critical Assets", color: "var(--chart-3)", pick: (d: SitRepCapsuleDatum) => d.criticalAssetCount },
  { name: "Checkpoint Ops", color: "var(--chart-2)", pick: (d: SitRepCapsuleDatum) => d.checkpointOpsTotal },
];

// Track width in px (matches the w-5 class below).
const TRACK_WIDTH_PX = 20;

// A round thumb centered on a rounded-full fill's top edge does NOT fully
// hide that cap just by matching its diameter to the track width — the
// cap's "shoulders" (where its curve meets the track's straight sides)
// still poke out unless the thumb's radius is at least sqrt(2) times the
// cap's radius (track width / 2). 1.5x gives a small safety margin over
// that minimum.
const THUMB_SIZE_PX = Math.ceil(TRACK_WIDTH_PX * 1.5);

/**
 * Grouped version of CapsuleBarChart's single-metric capsule bars — each
 * JTF gets a cluster of three fixed-height inset tracks (one per SITREP
 * metric), each with its own gradient-filled pill anchored to the
 * bottom, colored per the app's existing chart-1/2/3 tokens so the three
 * metrics stay distinguishable. A color-dot legend up top stands in for
 * recharts' <Legend> since these are plain divs, not an SVG chart.
 */
export function SitRepCapsuleChart({
  data,
  trackHeight = 160,
}: {
  data: SitRepCapsuleDatum[];
  trackHeight?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => SERIES.map((s) => s.pick(d))));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No SITREP data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="flex items-end justify-around gap-6 px-2" style={{ height: trackHeight + 28 }}>
        {data.map((d) => (
          <div key={d.jtfName} className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-1.5">
              {SERIES.map((s) => {
                const value = s.pick(d);
                // The fill must render at least as tall as the track is
                // wide, or it renders as a flat-topped pill instead of a
                // rounded dome the thumb is sized to cap.
                const minFillPct = (TRACK_WIDTH_PX / trackHeight) * 100;
                const fillPct = Math.max((value / max) * 100, value > 0 ? minFillPct : 0);
                return (
                  <div
                    key={s.name}
                    className="neu-inset relative w-5 rounded-full bg-input"
                    style={{ height: trackHeight }}
                    title={`${s.name}: ${value.toLocaleString()}`}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-full transition-all"
                      style={{
                        height: `${fillPct}%`,
                        background: `linear-gradient(to bottom, color-mix(in oklch, ${s.color}, white 35%), ${s.color})`,
                      }}
                    />
                    {value > 0 && (
                      <span
                        className="neu-raised absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full bg-white"
                        style={{ bottom: `${fillPct}%`, width: THUMB_SIZE_PX, height: THUMB_SIZE_PX }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-xs whitespace-nowrap text-muted-foreground">{d.jtfName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

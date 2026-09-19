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
                const fillPct = (value / max) * 100;
                return (
                  <div
                    key={s.name}
                    className="neu-inset relative flex w-5 flex-col justify-end rounded-full bg-input"
                    style={{ height: trackHeight }}
                    title={`${s.name}: ${value.toLocaleString()}`}
                  >
                    <div
                      className="relative w-full rounded-full transition-all"
                      style={{
                        height: `${Math.max(fillPct, value > 0 ? 6 : 0)}%`,
                        background: `linear-gradient(to bottom, color-mix(in oklch, ${s.color}, white 35%), ${s.color})`,
                      }}
                    >
                      <span className="neu-raised absolute top-0 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                    </div>
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

export interface SitRepCapsuleDatum {
  label: string;
  totalStrength: number;
  criticalAssetCount: number;
  /** Omitted for a by-Task-Group chart — Checkpoint Ops is tracked per
   * SitRep, not per Task Group, so there's no real per-Task-Group figure
   * to show (see TaskGroupSitRepSummary's doc comment). */
  checkpointOpsTotal?: number;
}

interface Series {
  name: string;
  color: string;
  pick: (d: SitRepCapsuleDatum) => number;
}

const BASE_SERIES: Series[] = [
  { name: "Total Strength", color: "var(--chart-1)", pick: (d) => d.totalStrength },
  { name: "Critical Assets", color: "var(--chart-3)", pick: (d) => d.criticalAssetCount },
];

const CHECKPOINT_OPS_SERIES: Series = {
  name: "Checkpoint Ops",
  color: "var(--chart-2)",
  pick: (d) => d.checkpointOpsTotal ?? 0,
};

// Track width in px (matches the w-5 class below).
const TRACK_WIDTH_PX = 20;

// The fill's bottom corners are fully rounded (track width / 2) so they
// blend seamlessly into the track's own rounded-full bottom cap — but the
// top corners use a much smaller radius, so a normal-sized thumb can
// fully cover it. A round thumb only fully hides a rounded cap if its own
// radius is at least sqrt(2) times the cap's radius, so 5px keeps a
// comfortable margin under an 18px thumb (needs >=14px).
const TOP_RADIUS_PX = 5;
const THUMB_SIZE_PX = 18;

/**
 * Grouped version of CapsuleBarChart's single-metric capsule bars — each
 * datum (a JTF, or a Task Group when showCheckpointOps is false) gets a
 * cluster of fixed-height inset tracks (one per SITREP metric), each with
 * its own gradient-filled pill anchored to the bottom, colored per the
 * app's existing chart-1/2/3 tokens so the metrics stay distinguishable.
 * A color-dot legend up top stands in for recharts' <Legend> since these
 * are plain divs, not an SVG chart.
 */
export function SitRepCapsuleChart({
  data,
  trackHeight = 160,
  showCheckpointOps = true,
}: {
  data: SitRepCapsuleDatum[];
  trackHeight?: number;
  showCheckpointOps?: boolean;
}) {
  const series = showCheckpointOps ? [...BASE_SERIES, CHECKPOINT_OPS_SERIES] : BASE_SERIES;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => s.pick(d))));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No SITREP data yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="flex items-end justify-around gap-6 px-2" style={{ height: trackHeight + 28 }}>
        {data.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-1.5">
              {series.map((s) => {
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
                      className="absolute inset-x-0 bottom-0 transition-all"
                      style={{
                        height: `${fillPct}%`,
                        borderRadius: `${TOP_RADIUS_PX}px ${TOP_RADIUS_PX}px ${TRACK_WIDTH_PX / 2}px ${TRACK_WIDTH_PX / 2}px`,
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
            <span className="text-xs whitespace-nowrap text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

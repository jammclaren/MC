export interface TopIncidentTypeDatum {
  label: string;
  count: number;
  /** Untruncated text for the hover tooltip, when `label` has already been
   * shortened for display — defaults to `label` when omitted. */
  fullLabel?: string;
}

/**
 * Ranked horizontal bar list — glow bars carry magnitude, every row is
 * directly labeled (count + share of all plotted incidents), so no
 * separate axis is needed per the dataviz skill's label-before-gridline
 * priority.
 */
export function TopIncidentTypesChart({
  data,
  total,
}: {
  data: TopIncidentTypeDatum[];
  total: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No incidents plotted yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d) => {
        const pct = total > 0 ? (d.count / total) * 100 : 0;
        const widthPct = (d.count / max) * 100;
        return (
          <div key={d.label} className="flex flex-col gap-1.5">
            <span className="truncate text-sm text-foreground" title={d.fullLabel ?? d.label}>
              {d.label}
            </span>
            <div className="flex items-center gap-3">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary shadow-[0_0_8px_var(--primary)] transition-all"
                  style={{ width: `${Math.max(widthPct, 3)}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                {d.count.toLocaleString()}
                <span className="ml-1.5 text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

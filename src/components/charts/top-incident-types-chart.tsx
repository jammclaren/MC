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
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No incidents plotted yet.</p>;
  }

  // `data` is only the top N labels — each bar's own count/percentage is
  // already correct against `total`, but the top N alone can fall well
  // short of it (e.g. many long-tail activity types beyond the ones
  // ranked here). Without this, the visible bars silently don't add up
  // to the total shown elsewhere on the page, which reads as miscounted
  // data rather than "there's more, just not ranked individually."
  const shown = data.reduce((sum, d) => sum + d.count, 0);
  const otherCount = total - shown;
  const rows: (TopIncidentTypeDatum & { isOther?: boolean })[] =
    otherCount > 0 ? [...data, { label: "Other", count: otherCount, isOther: true }] : data;
  const max = Math.max(1, ...rows.map((d) => d.count));

  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((d) => {
        const pct = total > 0 ? (d.count / total) * 100 : 0;
        const widthPct = (d.count / max) * 100;
        const isOther = d.isOther ?? false;
        return (
          <div key={d.label} className="flex flex-col gap-1.5">
            <span
              className={`truncate text-sm ${isOther ? "text-muted-foreground italic" : "text-foreground"}`}
              title={d.fullLabel ?? d.label}
            >
              {d.label}
            </span>
            <div className="flex items-center gap-3">
              <div className="neu-inset h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-input">
                <div
                  className={`h-full rounded-full transition-all ${isOther ? "bg-muted-foreground/50" : "bg-primary"}`}
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

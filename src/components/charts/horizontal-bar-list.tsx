export interface HorizontalBarDatum {
  label: string;
  value: number;
}

/**
 * Lightweight ranked bar list (plain divs, no Recharts) — for a simple
 * "label + one bar + count" ranking there's no need for a full charting
 * library. Styled to match SeverityMixChart's palette/spacing.
 */
export function HorizontalBarList({ data }: { data: HorizontalBarDatum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data logged yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">{d.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-foreground">
              {d.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--chart-1)]"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

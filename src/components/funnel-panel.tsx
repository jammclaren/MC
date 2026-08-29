import { cn } from "@/lib/utils";

export interface FunnelStageInput {
  label: string;
  count: number;
}

/**
 * Horizontal funnel: each stage's bar width is relative to the first
 * stage's count (not its own predecessor), so the panel reads as "how much
 * of the total made it this far" rather than a compounding conversion rate
 * — the more useful question for an ops pipeline (SPEC.md's election-ops
 * status fields) than a sales-funnel-style stage-over-stage rate.
 */
export function FunnelPanel({
  stages,
  compact = false,
}: {
  stages: FunnelStageInput[];
  compact?: boolean;
}) {
  const total = stages[0]?.count ?? 0;

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-4"}>
      {stages.map((stage, i) => {
        const pct = total > 0 ? (stage.count / total) * 100 : 0;
        return (
          <div key={stage.label} className={compact ? "flex flex-col gap-1" : "flex flex-col gap-1.5"}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{stage.label}</span>
              <span className="font-mono tabular-nums">
                {stage.count.toLocaleString()}
                {i > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({pct.toFixed(0)}%)
                  </span>
                )}
              </span>
            </div>
            <div
              className={cn(
                "w-full overflow-hidden rounded-full bg-muted",
                compact ? "h-2" : "h-2.5"
              )}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(pct, total > 0 && stage.count > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

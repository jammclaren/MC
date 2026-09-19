import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: "default" | "good" | "warning" | "critical";
  hint?: string;
}

const TONE_CLASSES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-primary",
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
};

/**
 * Command-center KPI tile: big tabular-nums figure, uppercase label, an
 * optional tone color reserved for status meaning (never decorative).
 */
export function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = "default",
  hint,
}: StatTileProps) {
  return (
    <div className="neu-raised relative flex flex-col gap-1 overflow-hidden rounded-md border-t-2 border-t-primary/60 bg-card px-4 py-3 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        {Icon && <Icon className={cn("size-4", TONE_CLASSES[tone])} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-3xl font-semibold tabular-nums",
            TONE_CLASSES[tone]
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

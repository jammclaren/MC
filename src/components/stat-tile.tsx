import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  tone?: "default" | "good" | "warning" | "critical";
  hint?: string;
  size?: "default" | "sm";
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
  size = "default",
}: StatTileProps) {
  const compact = size === "sm";
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-md border-t-2 border-t-primary/60 bg-card ring-1 ring-foreground/10",
        compact ? "gap-0.5 px-3 py-2" : "gap-1 px-4 py-3"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        {Icon && <Icon className={cn("size-4", TONE_CLASSES[tone])} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono font-semibold tabular-nums",
            compact ? "text-2xl" : "text-3xl",
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

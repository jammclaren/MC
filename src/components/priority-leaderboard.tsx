import { Badge } from "@/components/ui/badge";

export interface LeaderboardEntry {
  id: string;
  label: string;
  hotspotCategory: string | null;
  priorityScore: number;
}

const HOTSPOT_BADGE_VARIANT: Record<string, "critical" | "warning" | "good"> = {
  Red: "critical",
  Yellow: "warning",
  Green: "good",
};

export function PriorityLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-md px-2 py-1.5 odd:bg-muted/40"
        >
          <span className="font-display w-5 text-sm font-bold text-muted-foreground">
            {i + 1}
          </span>
          <span className="flex-1 truncate text-sm">{entry.label}</span>
          {entry.hotspotCategory && (
            <Badge variant={HOTSPOT_BADGE_VARIANT[entry.hotspotCategory] ?? "outline"}>
              {entry.hotspotCategory}
            </Badge>
          )}
          <span className="w-10 text-right font-mono text-sm font-semibold tabular-nums text-primary">
            {entry.priorityScore.toFixed(1)}
          </span>
        </div>
      ))}
      {entries.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No election areas recorded yet.
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

interface BpeCountdownProps {
  /** ISO timestamp for the start of the BPE window. */
  startDate: string;
  /** ISO timestamp for the end of the BPE window. */
  endDate: string;
}

/** Ticking days-remaining badge: recomputes against the real clock every
 * second (same pattern as LiveClock) instead of freezing at page-load time,
 * so the count rolls over at midnight without a refresh. */
export function BpeCountdown({ startDate, endDate }: BpeCountdownProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  if (now === null) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-muted-foreground">
        <CalendarClock className="size-5" />
        <span className="font-mono text-sm">--</span>
      </div>
    );
  }

  if (now > end) {
    return (
      <div className="text-center">
        <div className="font-mono text-3xl font-semibold text-muted-foreground">Concluded</div>
        <div className="mt-1 text-xs text-muted-foreground">Election window has closed</div>
      </div>
    );
  }

  const hasStarted = now >= start;
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  return (
    <div
      className={
        "flex items-center gap-2 rounded-md px-4 py-2 " +
        (daysRemaining <= 7
          ? "bg-status-critical/15 text-status-critical"
          : daysRemaining <= 14
            ? "bg-status-warning/15 text-status-warning"
            : "bg-muted text-foreground")
      }
    >
      <CalendarClock className="size-5" />
      <div>
        <div className="font-mono text-2xl font-bold tabular-nums">{daysRemaining}</div>
        <div className="text-xs uppercase tracking-wide">
          days {hasStarted ? "remaining" : "until start"}
        </div>
      </div>
    </div>
  );
}

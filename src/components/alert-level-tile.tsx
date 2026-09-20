"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ALERT_LEVELS, ALERT_LEVEL_ORDER, type AlertLevelCode } from "@/lib/alert-level";

interface AlertLevelTileProps {
  level: AlertLevelCode;
  updatedByName: string | null;
  /** ISO string, not a Date — this is a client component, and Date
   * objects don't survive the server->client boundary as themselves. */
  updatedAt: string | null;
  canWrite: boolean;
}

/**
 * Overview's 5th stat tile: the command-wide Alert Level Status, colored
 * by whichever level is currently set. Opens a dialog on click — everyone
 * gets the full White/Blue/Red reference (what each posture actually
 * means), but only COMMAND/WFC Maneuver ("M2")/ADMIN see "Set" buttons
 * (see canWriteAlertLevel).
 */
export function AlertLevelTile({ level, updatedByName, updatedAt, canWrite }: AlertLevelTileProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<AlertLevelCode | null>(null);
  const current = ALERT_LEVELS[level];

  async function setLevel(next: AlertLevelCode) {
    if (next === level || submitting) return;
    setSubmitting(next);
    try {
      const res = await fetch("/api/alert-level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update the Alert Level");
      }
      toast.success(`Alert Level set to ${ALERT_LEVELS[next].label}`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="neu-raised relative flex flex-col gap-1 overflow-hidden rounded-md bg-card px-4 py-3 text-left transition-opacity hover:opacity-90">
        <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Alert Level Status
        </span>
        <span
          className="font-display text-lg font-bold tracking-wide uppercase sm:text-2xl"
          style={{ color: current.color }}
        >
          {current.label}
        </span>
        <span className="text-xs text-muted-foreground">{current.phase}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alert Level Status</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {ALERT_LEVEL_ORDER.map((code) => {
            const option = ALERT_LEVELS[code];
            const isCurrent = code === level;
            return (
              <div
                key={code}
                className={cn("rounded-md border p-3", isCurrent ? "bg-muted/40" : "border-border")}
                style={isCurrent ? { borderColor: option.color } : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="font-display text-sm font-semibold uppercase"
                      style={{ color: option.color }}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{option.phase}</span>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      Current
                    </span>
                  ) : canWrite ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting !== null}
                      onClick={() => setLevel(code)}
                    >
                      {submitting === code ? "Setting…" : "Set"}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{option.description}</p>
              </div>
            );
          })}
        </div>
        {updatedByName && updatedAt && (
          <p className="text-xs text-muted-foreground">
            Last set by {updatedByName} on {new Date(updatedAt).toLocaleString()}
          </p>
        )}
        {!canWrite && (
          <p className="text-xs text-muted-foreground">
            Only COMMAND or WFC Maneuver (M2) can change the Alert Level.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

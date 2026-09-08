"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface IntelOverallAssessmentFormInitial {
  id: string;
  summary: string;
}

/** Manual entry for the Intelligence Update page's Overall Assessment —
 * sits alongside (never replaces) the auto-generated analysis, same "auto
 * stats + human narrative" split as JtfAssessmentCard. Purged (soft-
 * deleted) daily at 1700H — see api/intel-updates/overall-assessment/purge
 * — after which it's read-only history and no longer editable. */
export function IntelOverallAssessmentFormDialog({
  initial,
  trigger,
}: {
  initial?: IntelOverallAssessmentFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/intel-updates/overall-assessment/${initial!.id}`
        : "/api/intel-updates/overall-assessment";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Assessment updated" : "Overall assessment submitted");
      if (!isEdit) setSummary("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit" : "Manual"} Overall Assessment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Textarea
              required
              rows={5}
              maxLength={4000}
              placeholder="Your own overall assessment — this is added alongside the auto-generated analysis, not in place of it."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                Cleared automatically at 1700H daily, same as the auto-generated analysis above it.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !summary.trim()}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

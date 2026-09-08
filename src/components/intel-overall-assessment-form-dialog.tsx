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

/** Manual entry for the Intelligence Update page's Overall Assessment —
 * sits alongside (never replaces) the auto-generated analysis, same "auto
 * stats + human narrative" split as JtfAssessmentCard. Purged daily at
 * 1700H — see api/intel-updates/overall-assessment/purge. */
export function IntelOverallAssessmentFormDialog({ trigger }: { trigger: React.ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/intel-updates/overall-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success("Overall assessment submitted");
      setSummary("");
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
            <DialogTitle>Manual Overall Assessment</DialogTitle>
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
            <p className="text-xs text-muted-foreground">
              Cleared automatically at 1700H daily, same as the auto-generated analysis above it.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !summary.trim()}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { JtfAssessmentRow } from "@/lib/queries/jtf-assessments";
import { formatTimestamp24h } from "@/lib/datetime";

/**
 * A JTF's own narrative "overall assessment" — separate from the rule-based
 * Daily Analysis panel. JTF_COMMANDER/JTF_STAFF submit here; COMMAND and
 * WFC_STAFF (both command-wide readers) see every JTF's entries, a JTF
 * account sees only its own (server-scoped, see listJtfAssessments).
 */
export function JtfAssessmentCard({
  assessments,
  canSubmit,
}: {
  assessments: JtfAssessmentRow[];
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/jtf-assessments", {
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
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>JTF Overall Assessment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canSubmit && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-b border-border pb-4">
            <Textarea
              placeholder="Today's overall assessment for your area of operations..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              rows={3}
            />
            <Button type="submit" disabled={submitting || !summary.trim()} className="self-end">
              {submitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          </form>
        )}

        <div className="flex flex-col gap-3">
          {assessments.length === 0 && (
            <p className="text-sm text-muted-foreground">No overall assessments submitted yet.</p>
          )}
          {assessments.map((a) => (
            <div key={a.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-xs font-semibold tracking-widest text-primary uppercase">
                  {a.jtfName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.authorName} · {formatTimestamp24h(a.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-wrap">{a.summary}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

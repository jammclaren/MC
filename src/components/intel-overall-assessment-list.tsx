"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelOverallAssessmentFormDialog } from "@/components/intel-overall-assessment-form-dialog";
import { formatTimestamp24h } from "@/lib/datetime";
import type { IntelOverallAssessmentRow } from "@/lib/queries/intel-overall-assessment";

export function IntelOverallAssessmentList({
  assessments,
  canWrite,
}: {
  assessments: IntelOverallAssessmentRow[];
  canWrite: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);

  const active = useMemo(() => assessments.filter((a) => !a.purgedAt), [assessments]);
  const visible = showHistory ? assessments : active;

  if (assessments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? "Hide History" : "View History"}
        </Button>
      </div>

      {visible.map((a) => (
        <div key={a.id} className="rounded-md border border-border p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {a.authorName} · Date Posted: {formatTimestamp24h(a.createdAt)}
              {a.purgedAt && (
                <>
                  {" "}
                  · <Badge variant="outline">Cleared {formatTimestamp24h(a.purgedAt)}</Badge>
                </>
              )}
            </span>
            {canWrite && !a.purgedAt && (
              <IntelOverallAssessmentFormDialog
                initial={{ id: a.id, summary: a.summary }}
                trigger={
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                }
              />
            )}
          </div>
          <p className="mt-1.5 text-sm whitespace-pre-wrap">{a.summary}</p>
        </div>
      ))}
    </div>
  );
}

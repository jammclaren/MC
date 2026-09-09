"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, RefreshCw } from "lucide-react";

interface RecommendationTiers {
  strategic: string[];
  operational: string[];
  tactical: string[];
}

interface JtfAssessmentInput {
  jtfName: string;
  authorName: string;
  summary: string;
  createdAt: string;
}

interface DailyAssessment {
  reportDate: string;
  generatedAt: string;
  severityLevel: "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";
  incidentTrend: "increasing" | "decreasing" | "stable";
  analysis: string[];
  jtfAssessments: JtfAssessmentInput[];
  recommendations: RecommendationTiers;
}

const RECOMMENDATION_TIERS: { key: keyof RecommendationTiers; label: string; caption: string }[] = [
  {
    key: "strategic",
    label: "Strategic",
    caption: "BARMM-wide posture and cross-JTF resource allocation",
  },
  {
    key: "operational",
    label: "Operational",
    caption: "JTF/provincial coordination and BPE logistics",
  },
  {
    key: "tactical",
    label: "Tactical",
    caption: "Specific areas and incident types from monitored incidents",
  },
];

const SEVERITY_BADGE: Record<DailyAssessment["severityLevel"], "good" | "warning" | "serious" | "critical"> = {
  LOW: "good",
  MODERATE: "warning",
  ELEVATED: "serious",
  CRITICAL: "critical",
};

export function DailyAssessmentPanel() {
  const [assessment, setAssessment] = useState<DailyAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-assessment");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      setAssessment(await res.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Daily Analysis &amp; Assessment</CardTitle>
        </div>
        <Button onClick={handleGenerate} disabled={loading} variant="outline">
          {loading ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <ClipboardList className="size-4" />
          )}
          {assessment ? "Regenerate" : "Generate Daily Analysis"}
        </Button>
      </CardHeader>
      <CardContent>
        {!assessment ? (
          <p className="text-sm text-muted-foreground">
            Click &quot;Generate Daily Analysis&quot; to produce today&apos;s assessment and
            recommendations from current figures.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={SEVERITY_BADGE[assessment.severityLevel]}>
                {assessment.severityLevel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {assessment.reportDate} · generated{" "}
                {new Date(assessment.generatedAt).toLocaleTimeString("en-PH", {
                  timeZone: "Asia/Manila",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                PHT
              </span>
            </div>

            <div>
              <h3 className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Analysis
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {assessment.analysis.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {assessment.jtfAssessments.length > 0 && (
              <div>
                <h3 className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  JTF Inputs
                </h3>
                <div className="mt-2 flex flex-col gap-2">
                  {assessment.jtfAssessments.map((a, i) => (
                    <div key={i} className="rounded-md border border-border p-2.5 text-sm">
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
                          {a.jtfName}
                        </span>
                        <span className="text-xs text-muted-foreground">{a.authorName}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        &quot;{a.summary}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Recommendations / Actions to Be Taken
              </h3>
              <div className="mt-3 flex flex-col gap-4">
                {RECOMMENDATION_TIERS.map((tier) => (
                  <div key={tier.key}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
                        {tier.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{tier.caption}</span>
                    </div>
                    <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
                      {assessment.recommendations[tier.key].map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-status-warning">→</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

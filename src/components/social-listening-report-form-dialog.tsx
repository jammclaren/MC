"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import type { ParsedSocialListeningReport } from "@/lib/social-listening-pdf-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface IssueRow {
  label: string;
  mentions: string;
  engagementLabel: string;
  reachLabel: string;
  authors: string;
  status: string;
  riskLevel: string;
}

interface PlatformRow {
  platform: string;
  mentions: string;
}

interface ActivityRow {
  title: string;
  subtitle: string;
  sourceUrl: string;
  analysis: string;
  assessment: string;
}

export interface SocialListeningReportFormInitial {
  id: string;
  periodLabel: string;
  uniqueSources: string;
  engagementLabel: string;
  overallRiskLevel: string;
  riskRationale: string;
  dominantNarratives: string[];
  emergingNarratives: string[];
  indicatorsToWatch: string[];
  issues: IssueRow[];
  platformMentions: PlatformRow[];
  significantActivities: ActivityRow[];
}

const emptyIssue: IssueRow = {
  label: "",
  mentions: "",
  engagementLabel: "",
  reachLabel: "",
  authors: "",
  status: "",
  riskLevel: "",
};
const emptyPlatform: PlatformRow = { platform: "", mentions: "" };
const emptyActivity: ActivityRow = {
  title: "",
  subtitle: "",
  sourceUrl: "",
  analysis: "",
  assessment: "",
};

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function SocialListeningReportFormDialog({
  initial,
  trigger,
}: {
  initial?: SocialListeningReportFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [periodLabel, setPeriodLabel] = useState(initial?.periodLabel ?? "");
  const [uniqueSources, setUniqueSources] = useState(initial?.uniqueSources ?? "");
  const [engagementLabel, setEngagementLabel] = useState(initial?.engagementLabel ?? "");
  const [overallRiskLevel, setOverallRiskLevel] = useState(initial?.overallRiskLevel ?? "");
  const [riskRationale, setRiskRationale] = useState(initial?.riskRationale ?? "");
  const [dominantNarratives, setDominantNarratives] = useState(
    (initial?.dominantNarratives ?? []).join("\n")
  );
  const [emergingNarratives, setEmergingNarratives] = useState(
    (initial?.emergingNarratives ?? []).join("\n")
  );
  const [indicatorsToWatch, setIndicatorsToWatch] = useState(
    (initial?.indicatorsToWatch ?? []).join("\n")
  );
  const [issues, setIssues] = useState<IssueRow[]>(initial?.issues ?? [{ ...emptyIssue }]);
  const [platformMentions, setPlatformMentions] = useState<PlatformRow[]>(
    initial?.platformMentions ?? [{ ...emptyPlatform }]
  );
  const [significantActivities, setSignificantActivities] = useState<ActivityRow[]>(
    initial?.significantActivities ?? [{ ...emptyActivity }]
  );

  function updateIssue(i: number, patch: Partial<IssueRow>) {
    setIssues((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function updatePlatform(i: number, patch: Partial<PlatformRow>) {
    setPlatformMentions((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function updateActivity(i: number, patch: Partial<ActivityRow>) {
    setSignificantActivities((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const [parsingPdf, setParsingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePdfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/social-listening-reports/parse-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read this PDF");

      const parsed = data as ParsedSocialListeningReport;
      if (parsed.uniqueSources !== null) setUniqueSources(String(parsed.uniqueSources));
      if (parsed.engagementLabel) setEngagementLabel(parsed.engagementLabel);
      if (parsed.overallRiskLevel) setOverallRiskLevel(parsed.overallRiskLevel);
      if (parsed.riskRationale) setRiskRationale(parsed.riskRationale);
      if (parsed.dominantNarratives.length) setDominantNarratives(parsed.dominantNarratives.join("\n"));
      if (parsed.emergingNarratives.length) setEmergingNarratives(parsed.emergingNarratives.join("\n"));
      if (parsed.indicatorsToWatch.length) setIndicatorsToWatch(parsed.indicatorsToWatch.join("\n"));
      if (parsed.issues.length) {
        setIssues(
          parsed.issues.map((i) => ({
            label: i.label,
            mentions: String(i.mentions),
            engagementLabel: i.engagementLabel,
            reachLabel: i.reachLabel,
            authors: String(i.authors),
            status: i.status,
            riskLevel: i.riskLevel,
          }))
        );
      }
      if (parsed.platformMentions.length) {
        setPlatformMentions(
          parsed.platformMentions.map((p) => ({ platform: p.platform, mentions: String(p.mentions) }))
        );
      }
      if (parsed.significantActivities.length) {
        setSignificantActivities(
          parsed.significantActivities.map((a) => ({
            title: a.title,
            subtitle: a.subtitle,
            sourceUrl: a.sourceUrl ?? "",
            analysis: a.analysis,
            assessment: a.assessment,
          }))
        );
      }
      toast.success(
        `Extracted ${parsed.issues.length} issue(s), ${parsed.platformMentions.length} platform(s), ${parsed.significantActivities.length} activit${parsed.significantActivities.length === 1 ? "y" : "ies"} — review everything below before saving.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setParsingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/social-listening-reports/${initial!.id}`
        : "/api/social-listening-reports";
      const method = isEdit ? "PATCH" : "POST";

      const body = {
        periodLabel,
        uniqueSources: Number(uniqueSources) || 0,
        engagementLabel,
        overallRiskLevel,
        riskRationale,
        dominantNarratives: linesToList(dominantNarratives),
        emergingNarratives: linesToList(emergingNarratives),
        indicatorsToWatch: linesToList(indicatorsToWatch),
        issues: issues
          .filter((r) => r.label.trim())
          .map((r) => ({
            label: r.label,
            mentions: Number(r.mentions) || 0,
            engagementLabel: r.engagementLabel,
            reachLabel: r.reachLabel,
            authors: Number(r.authors) || 0,
            status: r.status,
            riskLevel: r.riskLevel,
          })),
        platformMentions: platformMentions
          .filter((r) => r.platform.trim())
          .map((r) => ({ platform: r.platform, mentions: Number(r.mentions) || 0 })),
        significantActivities: significantActivities
          .filter((r) => r.title.trim())
          .map((r) => ({
            title: r.title,
            subtitle: r.subtitle,
            sourceUrl: r.sourceUrl.trim() || null,
            analysis: r.analysis,
            assessment: r.assessment,
          })),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Report updated" : "Report logged");
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
      <DialogContent className="sm:max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Social Listening Report" : "Log New Social Listening Report"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto py-4">
            {!isEdit && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={parsingPdf}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-3.5" /> {parsingPdf ? "Reading PDF..." : "Extract from PDF"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Upload a report PDF with selectable text to pre-fill the fields below — review
                  everything before saving.
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="periodLabel">Report Period</Label>
                <Input
                  id="periodLabel"
                  required
                  placeholder="e.g. Sep 1-14, 2026"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="uniqueSources">Unique Sources</Label>
                <Input
                  id="uniqueSources"
                  type="number"
                  min={0}
                  required
                  value={uniqueSources}
                  onChange={(e) => setUniqueSources(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="engagementLabel">Engagement</Label>
                <Input
                  id="engagementLabel"
                  required
                  placeholder="e.g. 18.5K"
                  value={engagementLabel}
                  onChange={(e) => setEngagementLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="overallRiskLevel">Overall Risk Level</Label>
                <Input
                  id="overallRiskLevel"
                  required
                  placeholder="e.g. MODERATE-HIGH"
                  value={overallRiskLevel}
                  onChange={(e) => setOverallRiskLevel(e.target.value)}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="riskRationale">Risk Rationale</Label>
                <Textarea
                  id="riskRationale"
                  required
                  value={riskRationale}
                  onChange={(e) => setRiskRationale(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dominantNarratives">Dominant Narratives (one per line)</Label>
                <Textarea
                  id="dominantNarratives"
                  className="min-h-24"
                  value={dominantNarratives}
                  onChange={(e) => setDominantNarratives(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emergingNarratives">Emerging / Sensitive Narratives</Label>
                <Textarea
                  id="emergingNarratives"
                  className="min-h-24"
                  value={emergingNarratives}
                  onChange={(e) => setEmergingNarratives(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="indicatorsToWatch">Indicators to Watch</Label>
                <Textarea
                  id="indicatorsToWatch"
                  className="min-h-24"
                  value={indicatorsToWatch}
                  onChange={(e) => setIndicatorsToWatch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Issue Map</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIssues((rows) => [...rows, { ...emptyIssue }])}
                >
                  <Plus className="size-3.5" /> Add Issue
                </Button>
              </div>
              {issues.map((row, i) => (
                <div key={i} className="grid grid-cols-8 gap-2 rounded-lg border p-2">
                  <Input
                    className="col-span-2"
                    placeholder="Issue label"
                    value={row.label}
                    onChange={(e) => updateIssue(i, { label: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Mentions"
                    value={row.mentions}
                    onChange={(e) => updateIssue(i, { mentions: e.target.value })}
                  />
                  <Input
                    placeholder="Engagement"
                    value={row.engagementLabel}
                    onChange={(e) => updateIssue(i, { engagementLabel: e.target.value })}
                  />
                  <Input
                    placeholder="Reach"
                    value={row.reachLabel}
                    onChange={(e) => updateIssue(i, { reachLabel: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Authors"
                    value={row.authors}
                    onChange={(e) => updateIssue(i, { authors: e.target.value })}
                  />
                  <Input
                    placeholder="Status"
                    value={row.status}
                    onChange={(e) => updateIssue(i, { status: e.target.value })}
                  />
                  <div className="flex gap-1">
                    <Input
                      placeholder="Risk"
                      value={row.riskLevel}
                      onChange={(e) => updateIssue(i, { riskLevel: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIssues((rows) => rows.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Platform Distribution</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPlatformMentions((rows) => [...rows, { ...emptyPlatform }])}
                >
                  <Plus className="size-3.5" /> Add Platform
                </Button>
              </div>
              {platformMentions.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Platform (e.g. X / Twitter)"
                    value={row.platform}
                    onChange={(e) => updatePlatform(i, { platform: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Mentions"
                    value={row.mentions}
                    onChange={(e) => updatePlatform(i, { mentions: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setPlatformMentions((rows) => rows.filter((_, idx) => idx !== i))
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Significant Activities</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSignificantActivities((rows) => [...rows, { ...emptyActivity }])
                  }
                >
                  <Plus className="size-3.5" /> Add Activity
                </Button>
              </div>
              {significantActivities.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Title"
                      value={row.title}
                      onChange={(e) => updateActivity(i, { title: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setSignificantActivities((rows) => rows.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Subtitle (short teaser)"
                    value={row.subtitle}
                    onChange={(e) => updateActivity(i, { subtitle: e.target.value })}
                  />
                  <Input
                    placeholder="Source URL"
                    value={row.sourceUrl}
                    onChange={(e) => updateActivity(i, { sourceUrl: e.target.value })}
                  />
                  <Textarea
                    placeholder="Analysis"
                    value={row.analysis}
                    onChange={(e) => updateActivity(i, { analysis: e.target.value })}
                  />
                  <Textarea
                    placeholder="Assessment"
                    value={row.assessment}
                    onChange={(e) => updateActivity(i, { assessment: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Log report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

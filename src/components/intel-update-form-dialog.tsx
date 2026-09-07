"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { forward } from "mgrs";
import { toast } from "sonner";
import { parseMgrs } from "@/lib/mgrs";
import { THREAT_GROUP_SUGGESTIONS, INTEL_SOURCE_SUGGESTIONS } from "@/lib/intel-suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type IntelCategory = "NON_VIOLENT" | "VIOLENT";

export interface IntelUpdateFormInitial {
  id: string;
  activity: string;
  threatGroup: string;
  lat: number;
  lng: number;
  province: string;
  locationLabel: string;
  source: string;
  date: string;
}

export function IntelUpdateFormDialog({
  category,
  provinceOptions,
  initial,
  trigger,
}: {
  category: IntelCategory;
  provinceOptions: string[];
  initial?: IntelUpdateFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState(initial?.activity ?? "");
  const [threatGroup, setThreatGroup] = useState(initial?.threatGroup ?? "");
  const [mgrsInput, setMgrsInput] = useState(
    initial ? forward([initial.lng, initial.lat]) : ""
  );
  const [province, setProvince] = useState(initial?.province ?? "");
  const [locationLabel, setLocationLabel] = useState(initial?.locationLabel ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));

  const parsed = useMemo(() => parseMgrs(mgrsInput), [mgrsInput]);
  const categoryLabel = category === "VIOLENT" ? "Violent" : "Non-Violent";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/intel-updates/${initial!.id}` : "/api/intel-updates";
      const method = isEdit ? "PATCH" : "POST";
      const shared = {
        activity,
        threatGroup: threatGroup.trim() || (isEdit ? null : undefined),
        province,
        locationLabel,
        source: source.trim() || (isEdit ? null : undefined),
        mgrs: mgrsInput,
        date,
      };
      const body = isEdit ? shared : { category, ...shared };

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
      if (!isEdit) {
        setActivity("");
        setThreatGroup("");
        setMgrsInput("");
        setProvince("");
        setLocationLabel("");
        setSource("");
      }
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
            <DialogTitle>
              {isEdit ? "Edit" : "Log"} {categoryLabel} Activity
            </DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity">Activity</Label>
              <Textarea
                id="activity"
                required
                rows={3}
                maxLength={4000}
                placeholder="What was observed/reported"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="threatGroup">Threat Group</Label>
              <Input
                id="threatGroup"
                list="intel-threat-group-options"
                placeholder="e.g. DI, BIFF, NPA"
                value={threatGroup}
                onChange={(e) => setThreatGroup(e.target.value)}
              />
              <datalist id="intel-threat-group-options">
                {THREAT_GROUP_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mgrs">Grid Coordinates (MGRS)</Label>
              <Input
                id="mgrs"
                required
                placeholder="e.g. 51NUA6789054321"
                className="font-mono uppercase"
                value={mgrsInput}
                onChange={(e) => setMgrsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {"error" in parsed
                  ? mgrsInput.trim() && <span className="text-status-critical">{parsed.error}</span>
                  : `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                required
                list="intel-province-options"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
              <datalist id="intel-province-options">
                {provinceOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="locationLabel">Location</Label>
              <Input
                id="locationLabel"
                required
                placeholder="e.g. Brgy Libertad, Kolambugan, Lanao del Norte"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                list="intel-source-options"
                placeholder="e.g. HUMINT, OSINT, EMINT"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <datalist id="intel-source-options">
                {INTEL_SOURCE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
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

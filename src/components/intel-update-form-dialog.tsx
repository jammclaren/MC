"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { forward } from "mgrs";
import { toast } from "sonner";
import { parseMgrs } from "@/lib/mgrs";
import {
  ACTIVITY_TYPES_BY_CATEGORY,
  THREAT_GROUP_SUGGESTIONS,
  POLITICAL_PARTY_SUGGESTIONS,
  threatGroupPoliticalPartyConflict,
} from "@/lib/intel-suggestions";
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
  activityType: string;
  narrative: string;
  threatGroup: string;
  politicalParty: string;
  lat: number;
  lng: number;
  province: string;
  locationLabel: string;
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
  const [activityType, setActivityType] = useState(initial?.activityType ?? "");
  const [narrative, setNarrative] = useState(initial?.narrative ?? "");
  const [threatGroup, setThreatGroup] = useState(initial?.threatGroup ?? "");
  const [politicalParty, setPoliticalParty] = useState(initial?.politicalParty ?? "");
  const [mgrsInput, setMgrsInput] = useState(
    initial ? forward([initial.lng, initial.lat]) : ""
  );
  const [province, setProvince] = useState(initial?.province ?? "");
  const [locationLabel, setLocationLabel] = useState(initial?.locationLabel ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));

  const parsed = useMemo(() => parseMgrs(mgrsInput), [mgrsInput]);
  const categoryLabel = category === "VIOLENT" ? "Violent" : "Non-Violent";
  // Suggestions only — WFC-Intelligence can type any value, not just one of
  // the listed ones (same free-text-with-datalist pattern as Threat Group/
  // Province below).
  const activityTypeOptions = ACTIVITY_TYPES_BY_CATEGORY[category];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    const conflict = threatGroupPoliticalPartyConflict(threatGroup, politicalParty);
    if (conflict) {
      toast.error(conflict);
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/intel-updates/${initial!.id}` : "/api/intel-updates";
      const method = isEdit ? "PATCH" : "POST";
      const shared = {
        activityType,
        narrative,
        threatGroup: threatGroup.trim() || (isEdit ? null : undefined),
        politicalParty: politicalParty.trim() || (isEdit ? null : undefined),
        province,
        locationLabel,
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
        setActivityType("");
        setNarrative("");
        setThreatGroup("");
        setPoliticalParty("");
        setMgrsInput("");
        setProvince("");
        setLocationLabel("");
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
              <Label htmlFor="activityType">Type of Activity</Label>
              <Input
                id="activityType"
                required
                list="intel-activity-type-options"
                placeholder={`e.g. ${activityTypeOptions[0]}`}
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              />
              <datalist id="intel-activity-type-options">
                {activityTypeOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="narrative">Narrative</Label>
              <Textarea
                id="narrative"
                required
                rows={3}
                maxLength={4000}
                placeholder="What was observed/reported"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
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
              <Label htmlFor="politicalParty">Political Party</Label>
              <Input
                id="politicalParty"
                list="intel-political-party-options"
                placeholder="e.g. UBJP, BFP, BGC"
                value={politicalParty}
                onChange={(e) => setPoliticalParty(e.target.value)}
              />
              <datalist id="intel-political-party-options">
                {POLITICAL_PARTY_SUGGESTIONS.map((p) => (
                  <option key={p} value={p} />
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

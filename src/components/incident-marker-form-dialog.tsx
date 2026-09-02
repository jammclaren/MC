"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { forward } from "mgrs";
import { toast } from "sonner";
import { parseMgrs } from "@/lib/mgrs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface JtfOption {
  id: string;
  name: string;
}

export interface ElectionAreaOption {
  id: string;
  jtfId: string;
  label: string;
}

export interface IncidentMarkerFormInitial {
  id: string;
  electionAreaId?: string;
  lat: number;
  lng: number;
  date: string;
  type: string;
  result: string;
  markerStyle: string;
}

const NO_AREA_VALUE = "__none__";

const ANIMATION_OPTIONS = [
  { value: "NONE", label: "None — static marker" },
  { value: "BLINK", label: "Blink — fades in/out" },
  { value: "PULSE", label: "Pulse — grows/shrinks" },
] as const;

export function IncidentMarkerFormDialog({
  jtfOptions,
  areaOptions,
  lockJtfId,
  initial,
  trigger,
}: {
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  lockJtfId?: string;
  initial?: IncidentMarkerFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jtfId, setJtfId] = useState(lockJtfId ?? jtfOptions[0]?.id ?? "");
  const [electionAreaId, setElectionAreaId] = useState<string | undefined>(
    initial?.electionAreaId
  );
  const [mgrsInput, setMgrsInput] = useState(
    initial ? forward([initial.lng, initial.lat]) : ""
  );
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [type, setType] = useState(initial?.type ?? "");
  const [result, setResult] = useState(initial?.result ?? "");
  const [markerStyle, setMarkerStyle] = useState<string>(initial?.markerStyle ?? "PULSE");

  const parsed = useMemo(() => parseMgrs(mgrsInput), [mgrsInput]);
  const visibleAreas = areaOptions.filter((a) => a.jtfId === jtfId);
  // Lets each <Select>'s trigger show a real label instead of the raw
  // value — Base UI's Select.Value only resolves a label automatically
  // when the Root is given this `items` list.
  const jtfItems = useMemo(
    () => jtfOptions.map((jtf) => ({ value: jtf.id, label: jtf.name })),
    [jtfOptions]
  );
  const areaItems = useMemo(
    () => [
      { value: NO_AREA_VALUE, label: "No specific area" },
      ...visibleAreas.map((area) => ({ value: area.id, label: area.label })),
    ],
    [visibleAreas]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/incidents/${initial!.id}` : "/api/incidents";
      const method = isEdit ? "PATCH" : "POST";
      // POST's schema wants undefined for "not set" (no electionArea/result);
      // PATCH's wants null so it can explicitly clear a previously-set value.
      const body = isEdit
        ? {
            electionAreaId: electionAreaId || null,
            date,
            type,
            result: result || null,
            lat: parsed.lat,
            lng: parsed.lng,
            markerStyle,
          }
        : {
            jtfId,
            electionAreaId: electionAreaId || undefined,
            date,
            type,
            result: result || undefined,
            lat: parsed.lat,
            lng: parsed.lng,
            markerStyle,
            source: "MAP_MARKER",
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
      toast.success(isEdit ? "Marker updated" : "Marker placed");
      setOpen(false);
      if (!isEdit) {
        setMgrsInput("");
        setType("");
        setResult("");
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
            <DialogTitle>{isEdit ? "Edit Incident Marker" : "Add Incident Marker"}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-4">
            {!isEdit && !lockJtfId && (
              <div className="flex flex-col gap-2">
                <Label>JTF</Label>
                <Select
                  items={jtfItems}
                  value={jtfId}
                  onValueChange={(v: string | null) => {
                    setJtfId(v ?? "");
                    setElectionAreaId(undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select JTF" />
                  </SelectTrigger>
                  <SelectContent>
                    {jtfOptions.map((jtf) => (
                      <SelectItem key={jtf.id} value={jtf.id}>
                        {jtf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="mgrs">MGRS Grid Reference</Label>
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
              <Label>Area (optional)</Label>
              <Select
                items={areaItems}
                value={electionAreaId ?? NO_AREA_VALUE}
                onValueChange={(v: string | null) =>
                  setElectionAreaId(!v || v === NO_AREA_VALUE ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No specific area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AREA_VALUE}>No specific area</SelectItem>
                  {visibleAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                required
                maxLength={120}
                placeholder="e.g. harassment, checkpoint incident, ambush — a short category, not the full report"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="result">Result / Narrative (optional)</Label>
              <Textarea
                id="result"
                rows={3}
                maxLength={4000}
                placeholder="Outcome, or a longer narrative/OOA-style report — this field is unbounded, unlike Type"
                value={result}
                onChange={(e) => setResult(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Marker Animation</Label>
              <Select
                items={ANIMATION_OPTIONS}
                value={markerStyle}
                onValueChange={(v: string | null) => setMarkerStyle(v ?? "NONE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add marker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

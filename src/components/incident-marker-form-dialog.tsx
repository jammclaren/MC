"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toPoint } from "mgrs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const NO_AREA_VALUE = "__none__";

const ANIMATION_OPTIONS = [
  { value: "NONE", label: "None — static marker" },
  { value: "BLINK", label: "Blink — fades in/out" },
  { value: "PULSE", label: "Pulse — grows/shrinks" },
] as const;

/** Parses an MGRS string into a [lat, lng] pair, or returns an error
 * message. `mgrs.toPoint` throws on malformed input, so this wraps that in
 * a result the form can render inline instead of a thrown exception. */
function parseMgrs(raw: string): { lat: number; lng: number } | { error: string } {
  const trimmed = raw.trim().toUpperCase().replaceAll(" ", "");
  if (!trimmed) return { error: "Enter an MGRS grid reference" };
  try {
    const [lng, lat] = toPoint(trimmed);
    return { lat, lng };
  } catch {
    return { error: "Not a valid MGRS reference (e.g. 51NUA6789054321)" };
  }
}

export function IncidentMarkerFormDialog({
  jtfOptions,
  areaOptions,
  lockJtfId,
  trigger,
}: {
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  lockJtfId?: string;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jtfId, setJtfId] = useState(lockJtfId ?? jtfOptions[0]?.id ?? "");
  const [electionAreaId, setElectionAreaId] = useState<string | undefined>(undefined);
  const [mgrsInput, setMgrsInput] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("");
  const [result, setResult] = useState("");
  const [markerStyle, setMarkerStyle] = useState<string>("PULSE");

  const parsed = useMemo(() => parseMgrs(mgrsInput), [mgrsInput]);
  const visibleAreas = areaOptions.filter((a) => a.jtfId === jtfId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jtfId,
          electionAreaId: electionAreaId || undefined,
          date,
          type,
          result: result || undefined,
          lat: parsed.lat,
          lng: parsed.lng,
          markerStyle,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success("Marker placed");
      setOpen(false);
      setMgrsInput("");
      setType("");
      setResult("");
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
            <DialogTitle>Add Incident Marker</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-4">
            {!lockJtfId && (
              <div className="flex flex-col gap-2">
                <Label>JTF</Label>
                <Select
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
                placeholder="e.g. harassment, checkpoint incident, ambush"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="result">Result (optional)</Label>
              <Input id="result" value={result} onChange={(e) => setResult(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Marker Animation</Label>
              <Select value={markerStyle} onValueChange={(v: string | null) => setMarkerStyle(v ?? "NONE")}>
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
              {submitting ? "Placing..." : "Add marker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

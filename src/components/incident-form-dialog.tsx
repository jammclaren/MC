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

export interface IncidentFormValues {
  id?: string;
  jtfId: string;
  electionAreaId?: string;
  date: string;
  type: string;
  result?: string;
  lat?: number;
  lng?: number;
}

export function IncidentFormDialog({
  jtfOptions,
  areaOptions,
  lockJtfId,
  initial,
  trigger,
}: {
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  /** Non-ADMIN users can only write to their own JTF, so the JTF field is
   * fixed rather than a picker. */
  lockJtfId?: string;
  initial?: IncidentFormValues;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<IncidentFormValues>(
    initial ?? {
      jtfId: lockJtfId ?? jtfOptions[0]?.id ?? "",
      electionAreaId: undefined,
      date: new Date().toISOString().slice(0, 10),
      type: "",
      result: "",
    }
  );

  const [mgrsInput, setMgrsInput] = useState(
    initial?.lat != null && initial?.lng != null ? forward([initial.lng, initial.lat]) : ""
  );

  const isEdit = !!initial?.id;
  const visibleAreas = areaOptions.filter((a) => a.jtfId === values.jtfId);
  const parsedMgrs = useMemo(() => (mgrsInput.trim() ? parseMgrs(mgrsInput) : null), [mgrsInput]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (parsedMgrs && "error" in parsedMgrs) {
      toast.error(parsedMgrs.error);
      return;
    }
    const coords =
      parsedMgrs && !("error" in parsedMgrs) ? { lat: parsedMgrs.lat, lng: parsedMgrs.lng } : {};
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/incidents/${initial!.id}` : "/api/incidents";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? {
            date: values.date,
            type: values.type,
            result: values.result || null,
            electionAreaId: values.electionAreaId || null,
            lat: parsedMgrs ? coords.lat : null,
            lng: parsedMgrs ? coords.lng : null,
          }
        : { ...values, result: values.result || undefined, ...coords };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }

      toast.success(isEdit ? "Incident updated" : "Incident logged");
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
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Incident" : "Log Incident"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {!isEdit && (
              <div className="flex flex-col gap-2">
                <Label>JTF</Label>
                {lockJtfId ? (
                  <Input
                    disabled
                    value={jtfOptions.find((j) => j.id === lockJtfId)?.name ?? ""}
                  />
                ) : (
                  <Select
                    value={values.jtfId}
                    onValueChange={(jtfId: string | null) =>
                      setValues((v) => ({
                        ...v,
                        jtfId: jtfId ?? "",
                        electionAreaId: undefined,
                      }))
                    }
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
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="mgrs">MGRS Grid Reference (optional)</Label>
              <Input
                id="mgrs"
                placeholder="e.g. 51NUA6789054321"
                className="font-mono uppercase"
                value={mgrsInput}
                onChange={(e) => setMgrsInput(e.target.value)}
              />
              {parsedMgrs && (
                <p className="text-xs text-muted-foreground">
                  {"error" in parsedMgrs ? (
                    <span className="text-status-critical">{parsedMgrs.error}</span>
                  ) : (
                    `${parsedMgrs.lat.toFixed(5)}, ${parsedMgrs.lng.toFixed(5)}`
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Area (optional)</Label>
              <Select
                value={values.electionAreaId ?? "__none__"}
                onValueChange={(v: string | null) =>
                  setValues((prev) => ({
                    ...prev,
                    electionAreaId: !v || v === "__none__" ? undefined : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No specific area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific area</SelectItem>
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
                value={values.date}
                onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                required
                maxLength={120}
                placeholder="e.g. harassment, checkpoint incident, ambush — a short category, not the full report"
                value={values.type}
                onChange={(e) => setValues((v) => ({ ...v, type: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="result">Result / Narrative (optional)</Label>
              <Textarea
                id="result"
                rows={3}
                maxLength={4000}
                placeholder="Outcome, or a longer narrative/OOA-style report — this field is unbounded, unlike Type"
                value={values.result ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, result: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Log incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

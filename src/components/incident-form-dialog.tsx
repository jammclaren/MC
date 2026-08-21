"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export interface IncidentFormValues {
  id?: string;
  jtfId: string;
  electionAreaId?: string;
  date: string;
  type: string;
  result?: string;
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

  const isEdit = !!initial?.id;
  const visibleAreas = areaOptions.filter((a) => a.jtfId === values.jtfId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/incidents/${initial!.id}` : "/api/incidents";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { date: values.date, type: values.type, result: values.result || null, electionAreaId: values.electionAreaId || null }
        : { ...values, result: values.result || undefined };

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
                placeholder="e.g. harassment, checkpoint incident, ambush"
                value={values.type}
                onChange={(e) => setValues((v) => ({ ...v, type: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="result">Result (optional)</Label>
              <Input
                id="result"
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

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

export interface DeploymentFormValues {
  id?: string;
  jtfId: string;
  electionAreaId?: string;
  unitLabel: string;
  deployedToPolling: number;
  qrf: number;
  afpOfficers: number;
  afpEnlisted: number;
  caa: number;
  wavsTav: number;
  pnpOfficers: number;
  pnpEnlisted: number;
  checkpointOps: number;
}

const EMPTY: Omit<DeploymentFormValues, "jtfId"> = {
  unitLabel: "",
  deployedToPolling: 0,
  qrf: 0,
  afpOfficers: 0,
  afpEnlisted: 0,
  caa: 0,
  wavsTav: 0,
  pnpOfficers: 0,
  pnpEnlisted: 0,
  checkpointOps: 0,
};

function numField(value: string): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

export function DeploymentFormDialog({
  jtfOptions,
  areaOptions,
  lockJtfId,
  initial,
  trigger,
}: {
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  lockJtfId?: string;
  initial?: DeploymentFormValues;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<DeploymentFormValues>(
    initial ?? { jtfId: lockJtfId ?? jtfOptions[0]?.id ?? "", ...EMPTY }
  );

  const visibleAreas = areaOptions.filter((a) => a.jtfId === values.jtfId);

  function setField<K extends keyof DeploymentFormValues>(key: K, value: DeploymentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/deployments/${initial!.id}` : "/api/deployments";
      const method = isEdit ? "PATCH" : "POST";
      const { id: _id, jtfId, ...rest } = values;
      void _id;
      const body = isEdit ? rest : { jtfId, ...rest };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Deployment updated" : "Deployment logged");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const numberFields: { key: keyof DeploymentFormValues; label: string }[] = [
    { key: "deployedToPolling", label: "Deployed to Polling" },
    { key: "qrf", label: "QRF" },
    { key: "afpOfficers", label: "AFP Officers" },
    { key: "afpEnlisted", label: "AFP Enlisted" },
    { key: "caa", label: "CAA" },
    { key: "wavsTav", label: "WAVs/TAV" },
    { key: "pnpOfficers", label: "PNP Officers" },
    { key: "pnpEnlisted", label: "PNP Enlisted" },
    { key: "checkpointOps", label: "Checkpoint Ops" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Deployment" : "Log Deployment"}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[65vh] grid-cols-2 gap-4 overflow-y-auto py-4">
            {!isEdit && !lockJtfId && (
              <div className="col-span-2 flex flex-col gap-2">
                <Label>JTF</Label>
                <Select
                  value={values.jtfId}
                  onValueChange={(v: string | null) =>
                    setValues((prev) => ({ ...prev, jtfId: v ?? "", electionAreaId: undefined }))
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
              </div>
            )}
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="unitLabel">Unit</Label>
              <Input
                id="unitLabel"
                placeholder="e.g. 101BDE"
                value={values.unitLabel}
                onChange={(e) => setField("unitLabel", e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Area (optional)</Label>
              <Select
                value={values.electionAreaId ?? "__none__"}
                onValueChange={(v: string | null) =>
                  setField("electionAreaId", !v || v === "__none__" ? undefined : v)
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
            {numberFields.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  min={0}
                  value={values[key] as number}
                  onChange={(e) => setField(key, numField(e.target.value))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Log deployment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
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
  battalion: string;
  brigade: string;
  deployedToPolling: number;
  deployedToPollingCenters: number;
  qrf: number;
  afpOfficers: number;
  afpEnlisted: number;
  caa: number;
  wavsTav: number;
  pnpOfficers: number;
  pnpEnlisted: number;
  pcg: number;
  checkpointOps: number;
  airAssetType: string;
  airAssetCount: number;
  navalAssetType: string;
  navalAssetCount: number;
  isrAssetType: string;
  isrAssetCount: number;
}

const EMPTY: Omit<DeploymentFormValues, "jtfId"> = {
  battalion: "",
  brigade: "",
  deployedToPolling: 0,
  deployedToPollingCenters: 0,
  qrf: 0,
  afpOfficers: 0,
  afpEnlisted: 0,
  caa: 0,
  wavsTav: 0,
  pnpOfficers: 0,
  pnpEnlisted: 0,
  pcg: 0,
  checkpointOps: 0,
  airAssetType: "",
  airAssetCount: 0,
  navalAssetType: "",
  navalAssetCount: 0,
  isrAssetType: "",
  isrAssetCount: 0,
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
  // Lets each <Select>'s trigger show a real label instead of the raw
  // value — Base UI's Select.Value only resolves a label automatically
  // when the Root is given this `items` list.
  const jtfItems = useMemo(
    () => jtfOptions.map((jtf) => ({ value: jtf.id, label: jtf.name })),
    [jtfOptions]
  );
  const areaItems = useMemo(
    () => [
      { value: "__none__", label: "No specific area" },
      ...visibleAreas.map((area) => ({ value: area.id, label: area.label })),
    ],
    [visibleAreas]
  );

  function setField<K extends keyof DeploymentFormValues>(key: K, value: DeploymentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/deployments/${initial!.id}` : "/api/deployments";
      const method = isEdit ? "PATCH" : "POST";
      const {
        id: _id,
        jtfId,
        electionAreaId,
        battalion,
        brigade,
        airAssetType,
        navalAssetType,
        isrAssetType,
        ...rest
      } = values;
      void _id;
      // Create's schema wants the key omitted (not null) when blank; update's
      // schema is nullable, so an explicit null there clears a prior value —
      // otherwise picking "No specific area" (or blanking Battalion/Brigade/
      // an asset type) while editing would silently have no effect.
      const body = {
        ...rest,
        jtfId,
        electionAreaId: electionAreaId || (isEdit ? null : undefined),
        battalion: battalion.trim() || (isEdit ? null : undefined),
        brigade: brigade.trim() || (isEdit ? null : undefined),
        airAssetType: airAssetType.trim() || (isEdit ? null : undefined),
        navalAssetType: navalAssetType.trim() || (isEdit ? null : undefined),
        isrAssetType: isrAssetType.trim() || (isEdit ? null : undefined),
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
    { key: "deployedToPolling", label: "Deployed to Polling Precincts" },
    { key: "deployedToPollingCenters", label: "Deployed to Polling Centers" },
    { key: "qrf", label: "QRF" },
    { key: "afpOfficers", label: "AFP Officers" },
    { key: "afpEnlisted", label: "AFP Enlisted" },
    { key: "caa", label: "CAA" },
    { key: "wavsTav", label: "WAVs/TAV" },
    { key: "pnpOfficers", label: "PNP Officers" },
    { key: "pnpEnlisted", label: "PNP Enlisted" },
    { key: "pcg", label: "PCG" },
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
            {!lockJtfId && (
              <div className="col-span-2 flex flex-col gap-2">
                <Label>JTF</Label>
                <Select
                  items={jtfItems}
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="battalion">Battalion (leave blank for a Brigade-level entry)</Label>
              <Input
                id="battalion"
                placeholder="e.g. 40th IB"
                value={values.battalion}
                onChange={(e) => setField("battalion", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="brigade">Brigade (OPCON/Attached)</Label>
              <Input
                id="brigade"
                placeholder="e.g. 601st Brigade"
                value={values.brigade}
                onChange={(e) => setField("brigade", e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Area (optional)</Label>
              <Select
                items={areaItems}
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="airAssetType">Air Asset Type</Label>
              <Input
                id="airAssetType"
                placeholder="e.g. UH-1H Huey"
                value={values.airAssetType}
                onChange={(e) => setField("airAssetType", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="airAssetCount">Air Asset Count</Label>
              <Input
                id="airAssetCount"
                type="number"
                min={0}
                value={values.airAssetCount}
                onChange={(e) => setField("airAssetCount", numField(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="navalAssetType">Naval Asset Type</Label>
              <Input
                id="navalAssetType"
                placeholder="e.g. Rigid Hull Inflatable Boat"
                value={values.navalAssetType}
                onChange={(e) => setField("navalAssetType", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="navalAssetCount">Naval Asset Count</Label>
              <Input
                id="navalAssetCount"
                type="number"
                min={0}
                value={values.navalAssetCount}
                onChange={(e) => setField("navalAssetCount", numField(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="isrAssetType">ISR Asset Type</Label>
              <Input
                id="isrAssetType"
                placeholder="e.g. RQ-11 Raven UAV"
                value={values.isrAssetType}
                onChange={(e) => setField("isrAssetType", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="isrAssetCount">ISR Asset Count</Label>
              <Input
                id="isrAssetCount"
                type="number"
                min={0}
                value={values.isrAssetCount}
                onChange={(e) => setField("isrAssetCount", numField(e.target.value))}
              />
            </div>
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

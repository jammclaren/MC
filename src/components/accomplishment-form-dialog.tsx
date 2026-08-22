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

export interface IndicatorOption {
  id: string;
  name: string;
  subgroup: string | null;
}

const NEUTRALIZATION_TYPES = ["CAPTURED", "KILLED", "APPREHENDED", "SURRENDERED"] as const;
const FORCE_STATUSES = ["PSR", "NPSR"] as const;

export function AccomplishmentFormDialog({
  indicatorOptions,
  jtfOptions,
  lockJtfId,
  isAdmin,
  trigger,
}: {
  indicatorOptions: IndicatorOption[];
  jtfOptions: JtfOption[];
  lockJtfId?: string;
  /** ADMIN may log command-wide (no-JTF) records; other writers may not. */
  isAdmin: boolean;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [indicatorId, setIndicatorId] = useState(indicatorOptions[0]?.id ?? "");
  const [jtfId, setJtfId] = useState<string>(lockJtfId ?? jtfOptions[0]?.id ?? "");
  const [commandWide, setCommandWide] = useState(false);
  const [quarter, setQuarter] = useState("");
  const [neutralizationType, setNeutralizationType] = useState<string>("__none__");
  const [forceStatus, setForceStatus] = useState<string>("__none__");
  const [count, setCount] = useState("0");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/accomplishments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorId,
          jtfId: isAdmin && commandWide ? null : jtfId,
          quarter,
          neutralizationType: neutralizationType === "__none__" ? undefined : neutralizationType,
          forceStatus: forceStatus === "__none__" ? undefined : forceStatus,
          count: Number(count) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success("Accomplishment logged");
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log Accomplishment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Indicator</Label>
              <Select value={indicatorId} onValueChange={(v: string | null) => setIndicatorId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select indicator" />
                </SelectTrigger>
                <SelectContent>
                  {indicatorOptions.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.subgroup ? `${ind.subgroup} — ${ind.name}` : ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={commandWide}
                  onChange={(e) => setCommandWide(e.target.checked)}
                />
                Command-wide (not tied to a single JTF)
              </label>
            )}

            {!(isAdmin && commandWide) && !lockJtfId && (
              <div className="flex flex-col gap-2">
                <Label>JTF</Label>
                <Select value={jtfId} onValueChange={(v: string | null) => setJtfId(v ?? "")}>
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
              <Label htmlFor="quarter">Quarter</Label>
              <Input
                id="quarter"
                required
                placeholder="e.g. 1Q 2026"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Neutralization Type (optional)</Label>
              <Select value={neutralizationType} onValueChange={(v: string | null) => setNeutralizationType(v ?? "__none__")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not applicable</SelectItem>
                  {NEUTRALIZATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Force Status (optional)</Label>
              <Select value={forceStatus} onValueChange={(v: string | null) => setForceStatus(v ?? "__none__")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not applicable</SelectItem>
                  {FORCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                min={0}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Log accomplishment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

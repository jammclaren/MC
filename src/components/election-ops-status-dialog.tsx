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

// Stages of the paraphernalia's physical journey — distinct from the
// delivered/total counts above (those track *how much*, this tracks
// *where*), so a stalled shipment shows up even when the numbers alone
// wouldn't flag it.
const PARAPH_LOCATIONS = [
  "At COMELEC/Regional Office",
  "In Transit to Treasurer",
  "At Municipal/City Treasurer",
  "In Transit to Precinct",
  "At Precinct/Polling Place",
  "Delivered & Confirmed",
] as const;
const NO_LOCATION_VALUE = "__none__";

export interface ElectionOpsStatusValues {
  paraphTotalTreasurer: number | null;
  paraphDeliveredTreasurer: number | null;
  paraphTotalPrecinct: number | null;
  paraphDeliveredPrecinct: number | null;
  paraphLocation: string | null;
  acmTestedSealed: boolean;
  votingStarted: boolean;
  votingClosed: boolean;
  transmissionStatus: string | null;
  municipalCanvassPct: number | null;
  municipalProclaimed: boolean;
  provincialCanvassPct: number | null;
  provincialProclaimed: boolean;
}

const EMPTY_STATUS: ElectionOpsStatusValues = {
  paraphTotalTreasurer: null,
  paraphDeliveredTreasurer: null,
  paraphTotalPrecinct: null,
  paraphDeliveredPrecinct: null,
  paraphLocation: null,
  acmTestedSealed: false,
  votingStarted: false,
  votingClosed: false,
  transmissionStatus: null,
  municipalCanvassPct: null,
  municipalProclaimed: false,
  provincialCanvassPct: null,
  provincialProclaimed: false,
};

function numOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function ElectionOpsStatusDialog({
  electionAreaId,
  areaLabel,
  initial,
}: {
  electionAreaId: string;
  areaLabel: string;
  initial: ElectionOpsStatusValues | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<ElectionOpsStatusValues>(initial ?? EMPTY_STATUS);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/election-ops-status/${electionAreaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Update failed");
      }
      toast.success(`Updated status for ${areaLabel}`);
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
      <DialogTrigger render={<Button variant="outline" size="sm">Update Status</Button>} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Election Ops Status — {areaLabel}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label>Paraphernalia — Treasurer total</Label>
              <Input
                type="number"
                min={0}
                value={values.paraphTotalTreasurer ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, paraphTotalTreasurer: numOrNull(e.target.value) }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Paraphernalia — Treasurer delivered</Label>
              <Input
                type="number"
                min={0}
                value={values.paraphDeliveredTreasurer ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    paraphDeliveredTreasurer: numOrNull(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Paraphernalia — Precinct total</Label>
              <Input
                type="number"
                min={0}
                value={values.paraphTotalPrecinct ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, paraphTotalPrecinct: numOrNull(e.target.value) }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Paraphernalia — Precinct delivered</Label>
              <Input
                type="number"
                min={0}
                value={values.paraphDeliveredPrecinct ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    paraphDeliveredPrecinct: numOrNull(e.target.value),
                  }))
                }
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Paraphernalia — current location</Label>
              <Select
                items={[
                  { value: NO_LOCATION_VALUE, label: "Unspecified" },
                  ...PARAPH_LOCATIONS.map((loc) => ({ value: loc, label: loc })),
                ]}
                value={values.paraphLocation ?? NO_LOCATION_VALUE}
                onValueChange={(v: string | null) =>
                  setValues((prev) => ({
                    ...prev,
                    paraphLocation: !v || v === NO_LOCATION_VALUE ? null : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unspecified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LOCATION_VALUE}>Unspecified</SelectItem>
                  {PARAPH_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.acmTestedSealed}
                onChange={(e) =>
                  setValues((v) => ({ ...v, acmTestedSealed: e.target.checked }))
                }
              />
              ACM tested &amp; sealed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.votingStarted}
                onChange={(e) => setValues((v) => ({ ...v, votingStarted: e.target.checked }))}
              />
              Voting started
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.votingClosed}
                onChange={(e) => setValues((v) => ({ ...v, votingClosed: e.target.checked }))}
              />
              Voting closed
            </label>

            <div className="col-span-2 flex flex-col gap-2">
              <Label>Transmission status</Label>
              <Input
                value={values.transmissionStatus ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, transmissionStatus: e.target.value || null }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Municipal canvass %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={values.municipalCanvassPct ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, municipalCanvassPct: numOrNull(e.target.value) }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.municipalProclaimed}
                onChange={(e) =>
                  setValues((v) => ({ ...v, municipalProclaimed: e.target.checked }))
                }
              />
              Municipal proclaimed
            </label>

            <div className="flex flex-col gap-2">
              <Label>Provincial canvass %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={values.provincialCanvassPct ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, provincialCanvassPct: numOrNull(e.target.value) }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.provincialProclaimed}
                onChange={(e) =>
                  setValues((v) => ({ ...v, provincialProclaimed: e.target.checked }))
                }
              />
              Provincial proclaimed
            </label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

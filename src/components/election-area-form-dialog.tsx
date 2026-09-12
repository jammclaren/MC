"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BarangayIndex } from "@/lib/barangay-index";
import { parseMgrs, toMgrs } from "@/lib/mgrs";
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

export interface ElectionAreaFormInitial {
  id: string;
  jtfId: string;
  province: string;
  municipality: string;
  barangay: string;
  hotspotCategory: string;
  hotspotReason: string;
  numPrecincts: string;
  numCenters: string;
  registeredVoters: string;
  lat: string;
  lng: string;
}

const HOTSPOT_CATEGORIES = ["Red", "Orange", "Yellow", "Green"] as const;

function numOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export function ElectionAreaFormDialog({
  jtfOptions,
  lockJtfId,
  initial,
  barangayIndex,
  trigger,
}: {
  jtfOptions: JtfOption[];
  lockJtfId?: string;
  initial?: ElectionAreaFormInitial;
  /** GIS-boundary-derived name suggestions — picking from these (instead
   * of free-typing) keeps this area's name matching its actual map
   * polygon, so its hotspot category renders where it should instead of
   * silently going gray/unmatched over a spelling drift. */
  barangayIndex?: BarangayIndex;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jtfId, setJtfId] = useState(initial?.jtfId ?? lockJtfId ?? jtfOptions[0]?.id ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [municipality, setMunicipality] = useState(initial?.municipality ?? "");
  const [barangay, setBarangay] = useState(initial?.barangay ?? "");
  const [hotspotCategory, setHotspotCategory] = useState<string>(initial?.hotspotCategory ?? "");
  const [hotspotReason, setHotspotReason] = useState(initial?.hotspotReason ?? "");
  const [numPrecincts, setNumPrecincts] = useState(initial?.numPrecincts ?? "");
  const [numCenters, setNumCenters] = useState(initial?.numCenters ?? "");
  const [registeredVoters, setRegisteredVoters] = useState(initial?.registeredVoters ?? "");
  const [mgrsInput, setMgrsInput] = useState(() => {
    const lat = initial?.lat ? Number(initial.lat) : NaN;
    const lng = initial?.lng ? Number(initial.lng) : NaN;
    return Number.isNaN(lat) || Number.isNaN(lng) ? "" : toMgrs(lat, lng);
  });
  // Coordinates are optional here (unlike the incident marker's required
  // MGRS field) — a blank field just means "no coordinates on file", not
  // an error to block submission on.
  const parsedMgrs = useMemo(
    () => (mgrsInput.trim() ? parseMgrs(mgrsInput) : null),
    [mgrsInput]
  );

  const municipalityOptions = useMemo(
    () => barangayIndex?.municipalitiesByProvince[province.trim()] ?? [],
    [barangayIndex, province]
  );
  const barangayOptions = useMemo(
    () => barangayIndex?.barangaysByMunicipality[`${province.trim()}||${municipality.trim()}`] ?? [],
    [barangayIndex, province, municipality]
  );
  // Lets each <Select>'s trigger show a real label instead of the raw
  // value — Base UI's Select.Value only resolves a label automatically
  // when the Root is given this `items` list.
  const jtfItems = useMemo(
    () => jtfOptions.map((jtf) => ({ value: jtf.id, label: jtf.name })),
    [jtfOptions]
  );
  const hotspotItems = useMemo(
    () => [
      { value: "__none__", label: "Unclassified" },
      ...HOTSPOT_CATEGORIES.map((c) => ({ value: c, label: c })),
    ],
    []
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (parsedMgrs && "error" in parsedMgrs) {
      toast.error(parsedMgrs.error);
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/election-areas/${initial!.id}` : "/api/election-areas";
      const method = isEdit ? "PATCH" : "POST";
      const shared = {
        province,
        municipality: municipality || null,
        barangay: barangay || null,
        hotspotCategory: hotspotCategory || null,
        hotspotReason: hotspotReason || null,
        numPrecincts: numOrUndefined(numPrecincts) ?? null,
        numCenters: numOrUndefined(numCenters) ?? null,
        registeredVoters: numOrUndefined(registeredVoters) ?? null,
        lat: parsedMgrs ? parsedMgrs.lat : null,
        lng: parsedMgrs ? parsedMgrs.lng : null,
      };
      const body = isEdit ? shared : { jtfId, ...shared };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Area updated" : "Area added");
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
            <DialogTitle>{isEdit ? "Edit Election Area" : "Add Election Area"}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto py-4">
            {!isEdit && !lockJtfId && (
              <div className="col-span-2 flex flex-col gap-2">
                <Label>JTF</Label>
                <Select items={jtfItems} value={jtfId} onValueChange={(v: string | null) => setJtfId(v ?? "")}>
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
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                required
                list="election-area-province-options"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
              {barangayIndex && (
                <datalist id="election-area-province-options">
                  {barangayIndex.provinces.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="municipality">Municipality</Label>
              <Input
                id="municipality"
                list="election-area-municipality-options"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
              {barangayIndex && (
                <datalist id="election-area-municipality-options">
                  {municipalityOptions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="barangay">Barangay</Label>
              <Input
                id="barangay"
                list="election-area-barangay-options"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
              />
              {barangayIndex && (
                <datalist id="election-area-barangay-options">
                  {barangayOptions.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Hotspot Category</Label>
              <Select
                items={hotspotItems}
                value={hotspotCategory || "__none__"}
                onValueChange={(v: string | null) =>
                  setHotspotCategory(!v || v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unclassified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unclassified</SelectItem>
                  {HOTSPOT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hotspotReason">Hotspot Reason</Label>
              <Input
                id="hotspotReason"
                value={hotspotReason}
                onChange={(e) => setHotspotReason(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="numPrecincts">Precincts</Label>
              <Input
                id="numPrecincts"
                type="number"
                min={0}
                value={numPrecincts}
                onChange={(e) => setNumPrecincts(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="numCenters">Centers</Label>
              <Input
                id="numCenters"
                type="number"
                min={0}
                value={numCenters}
                onChange={(e) => setNumCenters(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="registeredVoters">Registered Voters</Label>
              <Input
                id="registeredVoters"
                type="number"
                min={0}
                value={registeredVoters}
                onChange={(e) => setRegisteredVoters(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
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
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add area"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

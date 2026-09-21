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
import type { ComponentType } from "@/generated/prisma/client";

interface UnitForm {
  unitName: string;
  strength: string;
}

interface AssetForm {
  assetName: string;
  number: string;
}

const emptyUnit = (): UnitForm => ({ unitName: "", strength: "" });
const emptyAsset = (): AssetForm => ({ assetName: "", number: "" });

/**
 * An Air Component account only ever logs Air units/assets, a Naval one
 * only Naval — this dialog shows a single component's section, never
 * both (see canWriteComponentSitRep / User.component). Total Assets is
 * derived live from the Breakdown rows, not entered directly, so it
 * can't drift from the rows that make it up.
 */
export function ComponentSitRepFormDialog({
  component,
  trigger,
}: {
  component: ComponentType;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [units, setUnits] = useState<UnitForm[]>([emptyUnit()]);
  const [assets, setAssets] = useState<AssetForm[]>([emptyAsset()]);

  const totalAssets = assets.reduce((sum, a) => sum + (Number(a.number) || 0), 0);
  const componentLabel = component === "AIR" ? "Air" : "Naval";

  function updateUnit(index: number, patch: Partial<UnitForm>) {
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }
  function addUnit() {
    setUnits((prev) => [...prev, emptyUnit()]);
  }
  function removeUnit(index: number) {
    setUnits((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAsset(index: number, patch: Partial<AssetForm>) {
    setAssets((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }
  function addAsset() {
    setAssets((prev) => [...prev, emptyAsset()]);
  }
  function removeAsset(index: number) {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setUnits([emptyUnit()]);
    setAssets([emptyAsset()]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        units: units
          .filter((u) => u.unitName.trim() !== "")
          .map((u) => ({ unitName: u.unitName.trim(), strength: Number(u.strength) || 0 })),
        assets: assets
          .filter((a) => a.assetName.trim() !== "")
          .map((a) => ({ assetName: a.assetName.trim(), number: Number(a.number) || 0 })),
      };

      const res = await fetch("/api/component-sitreps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success("SITREP logged");
      resetForm();
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log SITREP — {componentLabel} Component</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto py-4 pr-1">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Unit / Strength</Label>
              {units.map((u, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Unit"
                    value={u.unitName}
                    onChange={(e) => updateUnit(index, { unitName: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Strength"
                    className="w-28"
                    value={u.strength}
                    onChange={(e) => updateUnit(index, { strength: e.target.value })}
                  />
                  {units.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeUnit(index)}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={addUnit}>
                + Add another unit
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total {componentLabel} Assets</span>
              <span className="font-mono font-semibold tabular-nums">{totalAssets.toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Breakdown</Label>
              {assets.map((a, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={component === "AIR" ? "Asset, e.g. S70i" : "Asset, e.g. SURCS"}
                    value={a.assetName}
                    onChange={(e) => updateAsset(index, { assetName: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Number"
                    className="w-28"
                    value={a.number}
                    onChange={(e) => updateAsset(index, { number: e.target.value })}
                  />
                  {assets.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAsset(index)}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={addAsset}>
                + Add Asset
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Log SITREP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

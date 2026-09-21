"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileCheck2 } from "lucide-react";

interface SipsDeclarationCountTileProps {
  municipalCount: number;
  provinceCount: number;
  updatedByName: string | null;
  /** ISO string, not a Date — this is a client component, and Date
   * objects don't survive the server->client boundary as themselves. */
  updatedAt: string | null;
  canWrite: boolean;
}

/** CMO Workspace's 5th stat tile: the manually-maintained SIPS declaration
 * tally. Opens a dialog on click — everyone sees the current Municipal/
 * Province counts, only a CMO/ADMIN account (canWriteCmoActivity) gets the
 * number inputs to update them, same "click tile to edit" pattern as
 * Overview's AlertLevelTile. */
export function SipsDeclarationCountTile({
  municipalCount,
  provinceCount,
  updatedByName,
  updatedAt,
  canWrite,
}: SipsDeclarationCountTileProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [municipal, setMunicipal] = useState(String(municipalCount));
  const [province, setProvince] = useState(String(provinceCount));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const municipalValue = Number(municipal);
    const provinceValue = Number(province);
    if (!Number.isInteger(municipalValue) || municipalValue < 0) {
      toast.error("Municipal count must be a non-negative whole number");
      return;
    }
    if (!Number.isInteger(provinceValue) || provinceValue < 0) {
      toast.error("Province count must be a non-negative whole number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sips-declaration-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipalCount: municipalValue, provinceCount: provinceValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update SIPS declarations");
      }
      toast.success("SIPS declarations updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setMunicipal(String(municipalCount));
          setProvince(String(provinceCount));
        }
        setOpen(next);
      }}
    >
      <DialogTrigger className="neu-raised relative flex flex-col gap-1 overflow-hidden rounded-md bg-card px-4 py-3 text-left transition-opacity hover:opacity-90">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            SIPS Declared
          </span>
          <FileCheck2 className="size-4" />
        </div>
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="flex justify-between gap-2">
            <span className="text-muted-foreground">Municipal</span>
            <span className="font-mono font-semibold tabular-nums">{municipalCount.toLocaleString()}</span>
          </span>
          <span className="flex justify-between gap-2">
            <span className="text-muted-foreground">Province</span>
            <span className="font-mono font-semibold tabular-nums">{provinceCount.toLocaleString()}</span>
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>SIPS Declarations</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="municipalCount">Municipal</Label>
              <Input
                id="municipalCount"
                type="number"
                min={0}
                step={1}
                required
                disabled={!canWrite}
                value={municipal}
                onChange={(e) => setMunicipal(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provinceCount">Province</Label>
              <Input
                id="provinceCount"
                type="number"
                min={0}
                step={1}
                required
                disabled={!canWrite}
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>
          </div>
          {updatedByName && updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last set by {updatedByName} on {new Date(updatedAt).toLocaleString()}
            </p>
          )}
          {canWrite && (
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

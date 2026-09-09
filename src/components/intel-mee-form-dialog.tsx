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
import { TOW_WESTMIN_LABEL } from "@/lib/queries/intel-mee";

export interface JtfOption {
  id: string;
  name: string;
}

export interface IntelMeeFormInitial {
  id: string;
  jtfId: string | null;
  name: string;
  assetType: string;
  quantity: number;
}

// Sentinel Select value standing in for jtfId === null (TOW-WESTMIN) — the
// Select component needs a real string, never null/undefined.
const TOW_WESTMIN_VALUE = "__tow_westmin__";

export function IntelMeeFormDialog({
  jtfOptions,
  lockJtfId,
  initial,
  trigger,
}: {
  jtfOptions: JtfOption[];
  /** Omit to let the user pick a JTF (or TOW-WESTMIN). Pass a JTF id, or
   * `null` for TOW-WESTMIN, to lock the field (e.g. an "Add" button on one
   * specific card). */
  lockJtfId?: string | null;
  initial?: IntelMeeFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const isLocked = lockJtfId !== undefined;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jtfId, setJtfId] = useState<string | null>(
    initial ? initial.jtfId : isLocked ? lockJtfId : jtfOptions[0]?.id ?? null
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [assetType, setAssetType] = useState(initial?.assetType ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity.toString() ?? "0");

  const jtfItems = useMemo(
    () => [
      ...jtfOptions.map((jtf) => ({ value: jtf.id, label: jtf.name })),
      { value: TOW_WESTMIN_VALUE, label: TOW_WESTMIN_LABEL },
    ],
    [jtfOptions]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/intel-updates/mee/${initial!.id}` : "/api/intel-updates/mee";
      const method = isEdit ? "PATCH" : "POST";
      const body = {
        jtfId,
        name,
        assetType,
        quantity: Number(quantity) || 0,
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
      toast.success(isEdit ? "MEE entry updated" : "MEE entry logged");
      setOpen(false);
      if (!isEdit) {
        setName("");
        setAssetType("");
        setQuantity("0");
      }
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
            <DialogTitle>{isEdit ? "Edit" : "Log"} MEE Entry</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto py-4">
            {!isLocked && (
              <div className="flex flex-col gap-2">
                <Label>JTF</Label>
                <Select
                  items={jtfItems}
                  value={jtfId ?? TOW_WESTMIN_VALUE}
                  onValueChange={(v: string | null) =>
                    setJtfId(!v || v === TOW_WESTMIN_VALUE ? null : v)
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
                    <SelectItem value={TOW_WESTMIN_VALUE}>{TOW_WESTMIN_LABEL}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Thermal Imaging Kit #3"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="assetType">Type of Assets</Label>
              <Input
                id="assetType"
                required
                placeholder="e.g. Surveillance Equipment, Communications Gear"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Number</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Log entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

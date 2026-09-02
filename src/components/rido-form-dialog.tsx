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

const INVOLVING = ["LLEs/PAGs", "MNLF", "MILF"] as const;

export function RidoFormDialog({
  jtfOptions,
  lockJtfId,
  trigger,
}: {
  jtfOptions: JtfOption[];
  lockJtfId?: string;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jtfId, setJtfId] = useState(lockJtfId ?? jtfOptions[0]?.id ?? "");
  const [quarter, setQuarter] = useState("");
  const [involving, setInvolving] = useState<string>(INVOLVING[0]);
  const [count, setCount] = useState("0");
  // Lets the <Select>'s trigger show a real label instead of the raw
  // value — Base UI's Select.Value only resolves a label automatically
  // when the Root is given this `items` list.
  const jtfItems = useMemo(
    () => jtfOptions.map((jtf) => ({ value: jtf.id, label: jtf.name })),
    [jtfOptions]
  );
  const involvingItems = useMemo(() => INVOLVING.map((i) => ({ value: i, label: i })), []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jtfId, quarter, involving, count: Number(count) || 0 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success("Settlement logged");
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
            <DialogTitle>Log RIDO Settlement</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {!lockJtfId && (
              <div className="flex flex-col gap-2">
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
              <Label>Involving</Label>
              <Select
                items={involvingItems}
                value={involving}
                onValueChange={(v: string | null) => setInvolving(v ?? INVOLVING[0])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOLVING.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
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
              {submitting ? "Saving..." : "Log settlement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

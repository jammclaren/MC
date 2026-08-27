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

export interface PartyFormInitial {
  id: string;
  abbreviation: string;
  name: string;
}

export function PartyFormDialog({
  initial,
  trigger,
}: {
  initial?: PartyFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [abbreviation, setAbbreviation] = useState(initial?.abbreviation ?? "");
  const [name, setName] = useState(initial?.name ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/parties/${initial!.id}` : "/api/parties";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abbreviation: abbreviation.trim(), name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Party updated" : "Party added");
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
            <DialogTitle>{isEdit ? "Edit Party" : "Add Party"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="abbreviation">Abbreviation</Label>
              <Input
                id="abbreviation"
                required
                placeholder="e.g. BAPA"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Bangsamoro Party"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add party"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

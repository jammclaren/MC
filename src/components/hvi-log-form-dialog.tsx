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

export interface HviLogFormInitial {
  id: string;
  name: string;
  role: string;
  outcome: string;
  date: string;
  location: string;
  narrative: string;
}

export function HviLogFormDialog({
  category,
  initial,
  trigger,
}: {
  category: "CTG" | "LTG";
  initial?: HviLogFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [outcome, setOutcome] = useState(initial?.outcome ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [narrative, setNarrative] = useState(initial?.narrative ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/hvi-log/${initial!.id}` : "/api/hvi-log";
      const method = isEdit ? "PATCH" : "POST";
      const shared = {
        name,
        role: role || null,
        outcome,
        date,
        location: location || null,
        narrative,
      };
      const body = isEdit ? shared : { category, ...shared };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "HVI log entry updated" : "HVI log entry added");
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
            <DialogTitle>
              {isEdit ? "Edit HVI Log Entry" : "Add HVI Log Entry"} ({category})
            </DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hviName">Name</Label>
              <Input
                id="hviName"
                required
                placeholder="e.g. Juan Dela Cruz @Alias"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hviRole">Role (optional)</Label>
              <Input
                id="hviRole"
                placeholder="e.g. Secretary, FSMR"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hviOutcome">Outcome</Label>
              <Input
                id="hviOutcome"
                required
                placeholder="e.g. killed, arrested, surrendered"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hviDate">Date</Label>
              <Input
                id="hviDate"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hviLocation">Location (optional)</Label>
              <Input
                id="hviLocation"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hviNarrative">Narrative</Label>
              <textarea
                id="hviNarrative"
                required
                rows={4}
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

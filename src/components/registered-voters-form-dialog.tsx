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

/**
 * Focused data-entry dialog for a single barangay/area's registered-voter
 * count — a lightweight sibling to ElectionAreaFormDialog (which covers
 * every ElectionArea field) for the one figure the Election Profile page's
 * "Registered Voters" stat actually needs. Creates a plain ElectionArea row
 * scoped to the given province/JTF; hotspot category, precincts, etc. are
 * left unset and can be filled in later via the full Add Area form on the
 * Situation Map if that area also needs threat categorization.
 */
export function RegisteredVotersFormDialog({
  jtfId,
  province,
  trigger,
}: {
  jtfId: string;
  province: string;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [registeredVoters, setRegisteredVoters] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/election-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jtfId,
          province,
          municipality: municipality || undefined,
          barangay: barangay || undefined,
          registeredVoters: Number(registeredVoters),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success("Registered voters recorded");
      setOpen(false);
      setMunicipality("");
      setBarangay("");
      setRegisteredVoters("");
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
            <DialogTitle>Add Registered Voters — {province}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="municipality">Municipality</Label>
              <Input
                id="municipality"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="barangay">Barangay</Label>
              <Input id="barangay" value={barangay} onChange={(e) => setBarangay(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="registeredVoters">Registered Voters</Label>
              <Input
                id="registeredVoters"
                type="number"
                min={0}
                required
                value={registeredVoters}
                onChange={(e) => setRegisteredVoters(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

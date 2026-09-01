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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MunicipalityVoterTotal } from "@/lib/queries/election-board";

const DATALIST_ID = "registered-voters-municipality-options";

/**
 * Edits a municipality's (or, with a barangay filled in, a single
 * barangay's) registered-voter count. Backed by POST
 * /api/election-areas/voters, which updates the matching row if one
 * already exists instead of always creating a new one — the earlier
 * version of this button always created, so re-entering a figure (or
 * typing a slightly different spelling of the same municipality) silently
 * double-counted it in every province/BARMM-wide sum.
 */
export function RegisteredVotersFormDialog({
  jtfId,
  province,
  municipalityOptions,
  trigger,
}: {
  jtfId: string;
  province: string;
  municipalityOptions: MunicipalityVoterTotal[];
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [registeredVoters, setRegisteredVoters] = useState("");

  const totalsByMunicipality = new Map(
    municipalityOptions.map((m) => [m.municipality, m.registeredVoters])
  );

  function handleMunicipalityChange(value: string) {
    setMunicipality(value);
    // Prefill with the municipality's current total when it matches a
    // known one and the field hasn't been hand-edited yet, so picking an
    // existing municipality reads as "edit this figure" rather than a
    // blank add form.
    const known = totalsByMunicipality.get(value.trim());
    if (known !== undefined && registeredVoters === "") {
      setRegisteredVoters(String(known));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/election-areas/voters", {
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
      toast.success("Registered voters saved");
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
            <DialogTitle>Edit Registered Voters — {province}</DialogTitle>
            <DialogDescription>
              Pick an existing municipality to correct its figure, or enter a new
              municipality/barangay to add one. Leave barangay blank to set a
              municipality-wide total.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="municipality">Municipality</Label>
              <Input
                id="municipality"
                list={DATALIST_ID}
                value={municipality}
                onChange={(e) => handleMunicipalityChange(e.target.value)}
              />
              <datalist id={DATALIST_ID}>
                {municipalityOptions.map((m) => (
                  <option key={m.municipality} value={m.municipality} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="barangay">Barangay (optional)</Label>
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
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

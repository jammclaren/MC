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

export interface PartyOption {
  id: string;
  abbreviation: string;
  name: string;
}

export interface CandidateFormInitial {
  id: string;
  district: string;
  nameOnBallot: string;
  partyId: string;
  isCocFiler: boolean;
  votesEncoded: string;
  sourceNote: string;
}

const NEW_PARTY_VALUE = "__new_party__";
const NO_PARTY_VALUE = "__independent__";

export function CandidateFormDialog({
  jtfId,
  province,
  partyOptions,
  initial,
  trigger,
}: {
  jtfId: string;
  province: string;
  partyOptions: PartyOption[];
  initial?: CandidateFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [nameOnBallot, setNameOnBallot] = useState(initial?.nameOnBallot ?? "");
  const [partyId, setPartyId] = useState(initial?.partyId || NO_PARTY_VALUE);
  const [newPartyAbbr, setNewPartyAbbr] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [isCocFiler, setIsCocFiler] = useState(initial?.isCocFiler ?? true);
  const [votesEncoded, setVotesEncoded] = useState(initial?.votesEncoded ?? "0");
  const [sourceNote, setSourceNote] = useState(initial?.sourceNote ?? "");
  // Lets the <Select>'s trigger show a real label instead of the raw
  // value — Base UI's Select.Value only resolves a label automatically
  // when the Root is given this `items` list.
  const partyItems = useMemo(
    () => [
      { value: NO_PARTY_VALUE, label: "Independent / none" },
      ...partyOptions.map((p) => ({ value: p.id, label: `${p.abbreviation} — ${p.name}` })),
      { value: NEW_PARTY_VALUE, label: "+ New party…" },
    ],
    [partyOptions]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      let resolvedPartyId: string | null =
        partyId === NO_PARTY_VALUE || partyId === NEW_PARTY_VALUE ? null : partyId;

      if (partyId === NEW_PARTY_VALUE) {
        if (!newPartyAbbr.trim() || !newPartyName.trim()) {
          throw new Error("New party needs both an abbreviation and a full name");
        }
        const partyRes = await fetch("/api/parties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ abbreviation: newPartyAbbr.trim(), name: newPartyName.trim() }),
        });
        if (!partyRes.ok) {
          const data = await partyRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not create party");
        }
        resolvedPartyId = (await partyRes.json()).id;
      }

      const url = isEdit ? `/api/candidates/${initial!.id}` : "/api/candidates";
      const method = isEdit ? "PATCH" : "POST";
      const shared = {
        district: district || null,
        nameOnBallot,
        partyId: resolvedPartyId,
        isCocFiler,
        votesEncoded: Number(votesEncoded) || 0,
        sourceNote: sourceNote || null,
      };
      const body = isEdit ? shared : { jtfId, province, ...shared };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Candidate updated" : "Candidate added");
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
            <DialogTitle>{isEdit ? "Edit Candidate" : `Add Candidate — ${province}`}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nameOnBallot">Name on Ballot</Label>
              <Input
                id="nameOnBallot"
                required
                placeholder="SURNAME, First Name M."
                value={nameOnBallot}
                onChange={(e) => setNameOnBallot(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                placeholder="e.g. 3rd District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Party</Label>
              <Select
                items={partyItems}
                value={partyId}
                onValueChange={(v: string | null) => setPartyId(v ?? NO_PARTY_VALUE)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Independent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARTY_VALUE}>Independent / none</SelectItem>
                  {partyOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.abbreviation} — {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_PARTY_VALUE}>+ New party…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {partyId === NEW_PARTY_VALUE && (
              <div className="grid grid-cols-2 gap-4 rounded-md border border-border p-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="newPartyAbbr">Abbreviation</Label>
                  <Input
                    id="newPartyAbbr"
                    value={newPartyAbbr}
                    onChange={(e) => setNewPartyAbbr(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="newPartyName">Full Name</Label>
                  <Input
                    id="newPartyName"
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="votesEncoded">Votes Encoded</Label>
              <Input
                id="votesEncoded"
                type="number"
                min={0}
                value={votesEncoded}
                onChange={(e) => setVotesEncoded(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                checked={isCocFiler}
                onChange={(e) => setIsCocFiler(e.target.checked)}
              />
              Confirmed COC filer
            </label>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sourceNote">Source</Label>
              <Input
                id="sourceNote"
                placeholder="e.g. Manila Bulletin, May 9 2026"
                value={sourceNote}
                onChange={(e) => setSourceNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

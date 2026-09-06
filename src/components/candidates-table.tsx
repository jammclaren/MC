"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandidateFormDialog, type PartyOption } from "@/components/candidate-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { BoardCandidate } from "@/lib/queries/election-board";

const NO_DISTRICT_VALUE = "__no_district__";
const ALL_DISTRICTS_VALUE = "__all__";

export function CandidatesTable({
  candidates,
  canWrite,
  provinceJtfId,
  province,
  partyOptions,
}: {
  candidates: BoardCandidate[];
  canWrite: boolean;
  provinceJtfId?: string;
  province: string;
  partyOptions: PartyOption[];
}) {
  const [district, setDistrict] = useState(ALL_DISTRICTS_VALUE);

  const districts = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.district).filter(Boolean))).sort() as string[],
    [candidates]
  );

  const districtItems = useMemo(
    () => [
      { value: ALL_DISTRICTS_VALUE, label: "All Districts" },
      ...districts.map((d) => ({ value: d, label: d })),
      { value: NO_DISTRICT_VALUE, label: "No District" },
    ],
    [districts]
  );

  const filtered = useMemo(() => {
    const scoped =
      district === ALL_DISTRICTS_VALUE
        ? candidates
        : district === NO_DISTRICT_VALUE
          ? candidates.filter((c) => !c.district)
          : candidates.filter((c) => c.district === district);

    return scoped
      .slice()
      .sort((a, b) => (a.district ?? "").localeCompare(b.district ?? "") || a.nameOnBallot.localeCompare(b.nameOnBallot));
  }, [candidates, district]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by district:</span>
        <Select items={districtItems} value={district} onValueChange={(v) => setDistrict(v ?? ALL_DISTRICTS_VALUE)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DISTRICTS_VALUE}>All Districts</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
            <SelectItem value={NO_DISTRICT_VALUE}>No District</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name on Ballot</TableHead>
            <TableHead>District</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>COC Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nameOnBallot}</TableCell>
              <TableCell>{c.district ?? "—"}</TableCell>
              <TableCell>{c.partyAbbreviation ?? "Independent"}</TableCell>
              <TableCell>
                {c.isCocFiler ? (
                  <Badge variant="good">COC Filer</Badge>
                ) : (
                  <Badge variant="outline">Unconfirmed</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {canWrite && provinceJtfId && (
                  <div className="flex justify-end gap-1">
                    <CandidateFormDialog
                      jtfId={provinceJtfId}
                      province={province}
                      partyOptions={partyOptions}
                      initial={{
                        id: c.id,
                        district: c.district ?? "",
                        nameOnBallot: c.nameOnBallot,
                        partyId: c.partyId ?? "",
                        isCocFiler: c.isCocFiler,
                        votesEncoded: c.votesEncoded.toString(),
                        sourceNote: c.sourceNote ?? "",
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteButton
                      url={`/api/candidates/${c.id}`}
                      confirmMessage="Delete this candidate? This cannot be undone."
                    />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No candidates match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

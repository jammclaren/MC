"use client";

import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ElectionOpsStatusDialog } from "@/components/election-ops-status-dialog";
import { ElectionAreaFormDialog } from "@/components/election-area-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { ElectionOpsAreaRow } from "@/lib/queries/election-ops";

function pctLabel(pct: number | null): string {
  return pct === null ? "—" : `${pct.toFixed(0)}%`;
}

export interface ElectionOpsAreaRowWithAccess extends ElectionOpsAreaRow {
  canEdit: boolean;
}

interface MunicipalityGroup {
  key: string;
  label: string;
  areas: ElectionOpsAreaRowWithAccess[];
}

export function ElectionAreasAccordion({
  areas,
  jtfOptions,
}: {
  areas: ElectionOpsAreaRowWithAccess[];
  jtfOptions: { id: string; name: string }[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, MunicipalityGroup>();
    for (const area of areas) {
      const key = `${area.province}||${area.municipality ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.areas.push(area);
      } else {
        map.set(key, {
          key,
          label: [area.municipality, area.province].filter(Boolean).join(", ") || area.province,
          areas: [area],
        });
      }
    }
    return Array.from(map.values());
  }, [areas]);

  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No election areas in scope yet.
      </p>
    );
  }

  return (
    <Accordion multiple>
      {groups.map((group) => (
        <AccordionItem key={group.key} value={group.key}>
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>{group.label}</span>
              <Badge variant="outline">{group.areas.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barangay</TableHead>
                    <TableHead>JTF</TableHead>
                    <TableHead className="text-right">Treasurer %</TableHead>
                    <TableHead className="text-right">Precinct %</TableHead>
                    <TableHead>ACM</TableHead>
                    <TableHead>Voting</TableHead>
                    <TableHead>Transmission</TableHead>
                    <TableHead className="text-right">Municipal %</TableHead>
                    <TableHead className="text-right">Provincial %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.areas.map((area) => {
                    const s = area.status;
                    return (
                      <TableRow key={area.id}>
                        <TableCell>{area.barangay ?? area.label}</TableCell>
                        <TableCell>{area.jtfName}</TableCell>
                        <TableCell className="text-right">
                          {pctLabel(s?.paraphTreasurerPct ?? null)}
                        </TableCell>
                        <TableCell className="text-right">
                          {pctLabel(s?.paraphPrecinctPct ?? null)}
                        </TableCell>
                        <TableCell>
                          {s?.acmTestedSealed ? (
                            <Badge variant="good">Sealed</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {s?.votingClosed
                            ? "Closed"
                            : s?.votingStarted
                              ? "In progress"
                              : "Not started"}
                        </TableCell>
                        <TableCell>{s?.transmissionStatus ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {pctLabel(s?.municipalCanvassPct ?? null)}
                          {s?.municipalProclaimed ? " (Proclaimed)" : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          {pctLabel(s?.provincialCanvassPct ?? null)}
                          {s?.provincialProclaimed ? " (Proclaimed)" : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          {area.canEdit && (
                            <div className="flex justify-end gap-1">
                              <ElectionOpsStatusDialog
                                electionAreaId={area.id}
                                areaLabel={area.label}
                                initial={
                                  s
                                    ? {
                                        paraphTotalTreasurer: s.paraphTotalTreasurer,
                                        paraphDeliveredTreasurer: s.paraphDeliveredTreasurer,
                                        paraphTotalPrecinct: s.paraphTotalPrecinct,
                                        paraphDeliveredPrecinct: s.paraphDeliveredPrecinct,
                                        acmTestedSealed: s.acmTestedSealed,
                                        votingStarted: s.votingStarted,
                                        votingClosed: s.votingClosed,
                                        transmissionStatus: s.transmissionStatus,
                                        municipalCanvassPct: s.municipalCanvassPct,
                                        municipalProclaimed: s.municipalProclaimed,
                                        provincialCanvassPct: s.provincialCanvassPct,
                                        provincialProclaimed: s.provincialProclaimed,
                                      }
                                    : null
                                }
                              />
                              <ElectionAreaFormDialog
                                jtfOptions={jtfOptions}
                                initial={{
                                  id: area.id,
                                  jtfId: area.jtfId,
                                  province: area.province,
                                  municipality: area.municipality ?? "",
                                  barangay: area.barangay ?? "",
                                  hotspotCategory: area.hotspotCategory ?? "",
                                  hotspotReason: area.hotspotReason ?? "",
                                  numPrecincts: area.numPrecincts?.toString() ?? "",
                                  numCenters: area.numCenters?.toString() ?? "",
                                  registeredVoters: area.registeredVoters?.toString() ?? "",
                                  lat: area.lat?.toString() ?? "",
                                  lng: area.lng?.toString() ?? "",
                                }}
                                trigger={
                                  <Button variant="ghost" size="sm">
                                    Edit
                                  </Button>
                                }
                              />
                              <DeleteButton
                                url={`/api/election-areas/${area.id}`}
                                confirmMessage="Delete this election area? This cannot be undone."
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

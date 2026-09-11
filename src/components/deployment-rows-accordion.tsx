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
import {
  DeploymentFormDialog,
  type ElectionAreaOption,
  type JtfOption,
} from "@/components/deployment-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { DeploymentRow } from "@/lib/queries/deployments";

export interface DeploymentRowWithAccess extends DeploymentRow {
  canEdit: boolean;
}

interface JtfGroup {
  jtfId: string;
  jtfName: string;
  rows: DeploymentRowWithAccess[];
}

interface BrigadeGroup {
  brigade: string;
  rows: DeploymentRowWithAccess[];
}

/** Battalions grouped under the brigade they're OPCON to/attached to —
 * rows with no brigade on file fall into "Unassigned", sorted last so a
 * real brigade name always takes visual priority. */
function groupByBrigade(rows: DeploymentRowWithAccess[]): BrigadeGroup[] {
  const map = new Map<string, DeploymentRowWithAccess[]>();
  for (const row of rows) {
    const key = row.brigade?.trim() || "Unassigned";
    const existing = map.get(key);
    if (existing) existing.push(row);
    else map.set(key, [row]);
  }
  return Array.from(map.entries())
    .map(([brigade, rows]) => ({ brigade, rows }))
    .sort((a, b) => {
      if (a.brigade === "Unassigned") return 1;
      if (b.brigade === "Unassigned") return -1;
      return a.brigade.localeCompare(b.brigade);
    });
}

export function DeploymentRowsAccordion({
  rows,
  jtfOptions,
  areaOptions,
  lockJtfId,
}: {
  rows: DeploymentRowWithAccess[];
  jtfOptions: JtfOption[];
  areaOptions: ElectionAreaOption[];
  /** The one JTF this viewer may reassign a battalion to when editing, or
   * undefined for a command-wide account (ADMIN/Maneuver) that may move a
   * battalion to any JTF — same posture as the "Log Deployment" JTF picker. */
  lockJtfId?: string;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, JtfGroup>();
    for (const row of rows) {
      const existing = map.get(row.jtfId);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(row.jtfId, { jtfId: row.jtfId, jtfName: row.jtfName, rows: [row] });
      }
    }
    return Array.from(map.values());
  }, [rows]);

  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No deployment reports yet.
      </p>
    );
  }

  return (
    <Accordion multiple>
      {groups.map((group) => (
        <AccordionItem key={group.jtfId} value={group.jtfId}>
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>{group.jtfName}</span>
              <Badge variant="outline">{group.rows.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
            {groupByBrigade(group.rows).map((brigadeGroup) => (
              <div key={brigadeGroup.brigade} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <span>{brigadeGroup.brigade}</span>
                  <Badge variant="outline">{brigadeGroup.rows.length}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Battalion</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Precincts</TableHead>
                        <TableHead className="text-right">Centers</TableHead>
                        <TableHead className="text-right">QRF</TableHead>
                        <TableHead className="text-right">AFP Off.</TableHead>
                        <TableHead className="text-right">AFP Enl.</TableHead>
                        <TableHead className="text-right">CAA</TableHead>
                        <TableHead className="text-right">WAVs/TAV</TableHead>
                        <TableHead className="text-right">PNP Off.</TableHead>
                        <TableHead className="text-right">PNP Enl.</TableHead>
                        <TableHead className="text-right">PCG</TableHead>
                        <TableHead className="text-right">Checkpoints</TableHead>
                        <TableHead>Air Asset</TableHead>
                        <TableHead>Naval Asset</TableHead>
                        <TableHead>ISR Asset</TableHead>
                        <TableHead>Reported</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brigadeGroup.rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.battalion ?? "—"}</TableCell>
                          <TableCell>{row.areaLabel ?? "—"}</TableCell>
                          <TableCell className="text-right">{row.deployedToPolling}</TableCell>
                          <TableCell className="text-right">{row.deployedToPollingCenters}</TableCell>
                          <TableCell className="text-right">{row.qrf}</TableCell>
                          <TableCell className="text-right">{row.afpOfficers}</TableCell>
                          <TableCell className="text-right">{row.afpEnlisted}</TableCell>
                          <TableCell className="text-right">{row.caa}</TableCell>
                          <TableCell className="text-right">{row.wavsTav}</TableCell>
                          <TableCell className="text-right">{row.pnpOfficers}</TableCell>
                          <TableCell className="text-right">{row.pnpEnlisted}</TableCell>
                          <TableCell className="text-right">{row.pcg}</TableCell>
                          <TableCell className="text-right">{row.checkpointOps}</TableCell>
                          <TableCell>
                            {row.airAssetCount > 0
                              ? `${row.airAssetCount}${row.airAssetType ? ` × ${row.airAssetType}` : ""}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {row.navalAssetCount > 0
                              ? `${row.navalAssetCount}${row.navalAssetType ? ` × ${row.navalAssetType}` : ""}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {row.isrAssetCount > 0
                              ? `${row.isrAssetCount}${row.isrAssetType ? ` × ${row.isrAssetType}` : ""}`
                              : "—"}
                          </TableCell>
                          <TableCell>{row.reportedAt.toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {row.canEdit && (
                              <div className="flex justify-end gap-1">
                                <DeploymentFormDialog
                                  jtfOptions={jtfOptions}
                                  areaOptions={areaOptions}
                                  lockJtfId={lockJtfId}
                                  initial={{
                                    id: row.id,
                                    jtfId: row.jtfId,
                                    electionAreaId: row.electionAreaId ?? undefined,
                                    battalion: row.battalion ?? "",
                                    brigade: row.brigade ?? "",
                                    deployedToPolling: row.deployedToPolling,
                                    deployedToPollingCenters: row.deployedToPollingCenters,
                                    qrf: row.qrf,
                                    afpOfficers: row.afpOfficers,
                                    afpEnlisted: row.afpEnlisted,
                                    caa: row.caa,
                                    wavsTav: row.wavsTav,
                                    pnpOfficers: row.pnpOfficers,
                                    pnpEnlisted: row.pnpEnlisted,
                                    pcg: row.pcg,
                                    checkpointOps: row.checkpointOps,
                                    airAssetType: row.airAssetType ?? "",
                                    airAssetCount: row.airAssetCount,
                                    navalAssetType: row.navalAssetType ?? "",
                                    navalAssetCount: row.navalAssetCount,
                                    isrAssetType: row.isrAssetType ?? "",
                                    isrAssetCount: row.isrAssetCount,
                                  }}
                                  trigger={
                                    <Button variant="ghost" size="sm">
                                      Edit
                                    </Button>
                                  }
                                />
                                <DeleteButton
                                  url={`/api/deployments/${row.id}`}
                                  confirmMessage="Delete this deployment report? This cannot be undone."
                                />
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

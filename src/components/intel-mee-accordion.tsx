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
import { IntelMeeFormDialog, type JtfOption } from "@/components/intel-mee-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { IntelMeeAssetRow } from "@/lib/queries/intel-mee";

interface JtfGroup {
  jtfId: string;
  jtfName: string;
  rows: IntelMeeAssetRow[];
}

export function IntelMeeAccordion({
  rows,
  jtfOptions,
  canWrite,
}: {
  rows: IntelMeeAssetRow[];
  jtfOptions: JtfOption[];
  canWrite: boolean;
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
    return Array.from(map.values()).sort((a, b) => a.jtfName.localeCompare(b.jtfName));
  }, [rows]);

  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No MEE entries on file yet.
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
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type of Assets</TableHead>
                    <TableHead className="text-right">Number</TableHead>
                    <TableHead>Grid (MGRS)</TableHead>
                    <TableHead>Logged</TableHead>
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.assetType}</TableCell>
                      <TableCell className="text-right">{row.quantity.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{row.mgrs}</TableCell>
                      <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <IntelMeeFormDialog
                              jtfOptions={jtfOptions}
                              initial={{
                                id: row.id,
                                jtfId: row.jtfId,
                                name: row.name,
                                assetType: row.assetType,
                                quantity: row.quantity,
                                lat: row.lat,
                                lng: row.lng,
                              }}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                            <DeleteButton
                              url={`/api/intel-updates/mee/${row.id}`}
                              confirmMessage="Delete this MEE entry? This cannot be undone."
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

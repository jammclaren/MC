"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { IntelUpdateFormDialog } from "@/components/intel-update-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { IntelUpdateRow } from "@/lib/queries/intel-updates";

interface ProvinceGroup {
  province: string;
  rows: IntelUpdateRow[];
}

export function IntelUpdatesPanel({
  rows,
  provinceOptions,
  canWrite,
}: {
  rows: IntelUpdateRow[];
  provinceOptions: string[];
  canWrite: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.activity, r.threatGroup, r.locationLabel, r.source, r.province, r.mgrs]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const groups = useMemo(() => {
    const map = new Map<string, ProvinceGroup>();
    for (const row of filtered) {
      const existing = map.get(row.province);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(row.province, { province: row.province, rows: [row] });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.province.localeCompare(b.province));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search by activity, threat group, location, source, province, or grid reference..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {groups.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {search ? "No reports match this search." : "No intelligence reports on file yet."}
        </p>
      )}

      <Accordion multiple>
        {groups.map((group) => (
          <AccordionItem key={group.province} value={group.province}>
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span>{group.province}</span>
                <Badge variant="outline">{group.rows.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Threat Group</TableHead>
                      <TableHead>Grid (MGRS)</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      {canWrite && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Badge variant={row.category === "VIOLENT" ? "critical" : "warning"}>
                            {row.category === "VIOLENT" ? "Violent" : "Non-Violent"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">{row.activity}</TableCell>
                        <TableCell>{row.threatGroup ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.mgrs}</TableCell>
                        <TableCell>{row.locationLabel}</TableCell>
                        <TableCell>{row.source ?? "—"}</TableCell>
                        <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <IntelUpdateFormDialog
                                category={row.category}
                                provinceOptions={provinceOptions}
                                initial={{
                                  id: row.id,
                                  activity: row.activity,
                                  threatGroup: row.threatGroup ?? "",
                                  lat: row.lat,
                                  lng: row.lng,
                                  province: row.province,
                                  locationLabel: row.locationLabel,
                                  source: row.source ?? "",
                                  date: row.date.slice(0, 10),
                                }}
                                trigger={
                                  <Button variant="ghost" size="sm">
                                    Edit
                                  </Button>
                                }
                              />
                              <DeleteButton
                                url={`/api/intel-updates/${row.id}`}
                                confirmMessage="Delete this intelligence report? This cannot be undone."
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
    </div>
  );
}

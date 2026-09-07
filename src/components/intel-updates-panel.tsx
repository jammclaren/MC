"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
        className="max-w-md border-2 border-status-warning"
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
              {/* A multi-column table forces long free-text Activity/
                  Location reports (some are full narrative paragraphs) into
                  cramped columns no matter how the cells wrap or how wide
                  the viewport is — a stacked card per report sidesteps
                  table column sizing entirely instead of fighting it. */}
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {group.rows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={row.category === "VIOLENT" ? "critical" : "warning"}>
                        {row.category === "VIOLENT" ? "Violent" : "Non-Violent"}
                      </Badge>
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(row.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm break-words whitespace-normal">{row.activity}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <div className="break-words">
                        <span className="font-medium text-foreground">Threat Group: </span>
                        {row.threatGroup ?? "—"}
                      </div>
                      <div className="break-words">
                        <span className="font-medium text-foreground">Source: </span>
                        {row.source ?? "—"}
                      </div>
                      <div className="col-span-2 break-words">
                        <span className="font-medium text-foreground">Location: </span>
                        {row.locationLabel}
                      </div>
                      <div className="col-span-2 break-words">
                        <span className="font-medium text-foreground">Grid: </span>
                        <span className="font-mono">{row.mgrs}</span>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex justify-end gap-1 border-t border-border/60 pt-2">
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
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

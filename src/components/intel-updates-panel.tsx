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
      [
        r.activityType,
        r.threatGroup,
        r.narrative,
        new Date(r.date).toLocaleDateString(),
        new Date(r.createdAt).toLocaleDateString(),
      ]
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

  // Hides the whole province list — headers (Basilan, Cotabato City, etc)
  // included, not just each AccordionItem's collapsed content — a plain
  // conditional render rather than the accordion's own expand/collapse.
  const [listHidden, setListHidden] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search by type of activity, date, threat group, or keywords in the report..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md border-2 border-status-warning"
        />
        {groups.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setListHidden((v) => !v)}>
            {listHidden ? "Show Provinces" : "Hide Provinces"}
          </Button>
        )}
      </div>

      {groups.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {search ? "No reports match this search." : "No intelligence reports on file yet."}
        </p>
      )}

      {!listHidden && (
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
                      <div className="flex items-center gap-2">
                        <Badge variant={row.category === "VIOLENT" ? "critical" : "warning"}>
                          {row.category === "VIOLENT" ? "Violent" : "Non-Violent"}
                        </Badge>
                        {row.activityType && (
                          <span className="text-sm font-medium text-foreground">
                            {row.activityType}
                          </span>
                        )}
                      </div>
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(row.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm break-words whitespace-normal">{row.narrative}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <div className="break-words">
                        <span className="font-medium text-foreground">Date of Activity: </span>
                        {new Date(row.date).toLocaleDateString()}
                      </div>
                      <div className="break-words">
                        <span className="font-medium text-foreground">Date Reported: </span>
                        {new Date(row.createdAt).toLocaleDateString()}
                      </div>
                      <div className="col-span-2 break-words">
                        <span className="font-medium text-foreground">Threat Group: </span>
                        {row.threatGroup ?? "—"}
                      </div>
                      <div className="col-span-2 break-words">
                        <span className="font-medium text-foreground">Political Party: </span>
                        {row.politicalParty ?? "—"}
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
                            activityType: row.activityType ?? "",
                            narrative: row.narrative,
                            threatGroup: row.threatGroup ?? "",
                            politicalParty: row.politicalParty ?? "",
                            lat: row.lat,
                            lng: row.lng,
                            province: row.province,
                            locationLabel: row.locationLabel,
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
      )}
    </div>
  );
}

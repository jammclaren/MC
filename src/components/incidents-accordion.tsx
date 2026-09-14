"use client";

import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IncidentFormDialog,
  type IncidentFormValues,
  type JtfOption,
} from "@/components/incident-form-dialog";
import { DeleteButton } from "@/components/delete-button";

export interface IncidentRow {
  id: string;
  date: Date;
  jtfName: string;
  areaLabel: string;
  type: string;
  result: string | null;
  canEdit: boolean;
  editInitial: IncidentFormValues;
}

interface TypeGroup {
  type: string;
  rows: IncidentRow[];
}

/** Groups incidents by their type/name — the same classification already
 * used for the Top Incident Types breakdown elsewhere on the dashboard —
 * so the two views agree on category and someone scanning the log can
 * jump straight to, say, every "Fire Fight" instead of scrolling past
 * everything else. `rows` arrives newest-first (see listIncidents'
 * orderBy), so each group's first row is its most recent incident — groups
 * are ordered by that, not by how many incidents share the type, so a
 * type with just one fresh report still surfaces near the top instead of
 * sinking below busier-but-staler categories. */
function groupByType(rows: IncidentRow[]): TypeGroup[] {
  const map = new Map<string, IncidentRow[]>();
  for (const row of rows) {
    const existing = map.get(row.type);
    if (existing) existing.push(row);
    else map.set(row.type, [row]);
  }
  return Array.from(map.entries())
    .map(([type, rows]) => ({ type, rows }))
    .sort((a, b) => b.rows[0].date.getTime() - a.rows[0].date.getTime());
}

/** Per-incident dropdown instead of a wide table — the same detail fields
 * (date, JTF, area, result) that used to force a horizontal scroll on
 * narrow screens now only show once a row is expanded. Grouped by
 * incident type so entries are also classified by name. */
export function IncidentsAccordion({
  rows,
  jtfOptions,
}: {
  rows: IncidentRow[];
  jtfOptions: JtfOption[];
}) {
  const groups = useMemo(() => groupByType(rows), [rows]);

  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No incidents match these filters.
      </p>
    );
  }

  return (
    <Accordion multiple>
      {groups.map((group) => (
        <AccordionItem key={group.type} value={group.type}>
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>{group.type}</span>
              <Badge variant="outline">{group.rows.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Accordion multiple className="border-t border-border">
              {group.rows.map((row) => (
                <AccordionItem key={row.id} value={row.id}>
                  <AccordionTrigger>
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2 text-left text-sm">
                      <span>{row.areaLabel}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.date.toLocaleDateString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                      <dt className="text-muted-foreground">Date</dt>
                      <dd>{row.date.toLocaleDateString()}</dd>
                      <dt className="text-muted-foreground">JTF</dt>
                      <dd>{row.jtfName}</dd>
                      <dt className="text-muted-foreground">Area</dt>
                      <dd>{row.areaLabel}</dd>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>{row.type}</dd>
                      <dt className="text-muted-foreground">Result</dt>
                      <dd>{row.result ?? "—"}</dd>
                    </dl>
                    {row.canEdit && (
                      <div className="mt-3 flex gap-2">
                        <IncidentFormDialog
                          jtfOptions={jtfOptions}
                          initial={row.editInitial}
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                        />
                        <DeleteButton
                          url={`/api/incidents/${row.id}`}
                          confirmMessage="Delete this incident? This cannot be undone."
                        />
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

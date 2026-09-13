"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

/** Per-incident dropdown instead of a wide table — the same detail fields
 * (date, JTF, area, result) that used to force a horizontal scroll on
 * narrow screens now only show once a row is expanded. */
export function IncidentsAccordion({
  rows,
  jtfOptions,
}: {
  rows: IncidentRow[];
  jtfOptions: JtfOption[];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No incidents match these filters.
      </p>
    );
  }

  return (
    <Accordion multiple>
      {rows.map((row) => (
        <AccordionItem key={row.id} value={row.id}>
          <AccordionTrigger>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2 text-left">
              <span className="font-medium">{row.type}</span>
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
  );
}

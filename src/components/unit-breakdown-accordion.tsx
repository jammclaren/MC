"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { UnitBreakdownRow } from "@/lib/queries/sitreps";

function groupByTaskGroup(rows: UnitBreakdownRow[]): [string, UnitBreakdownRow[]][] {
  const byTaskGroup = new Map<string, UnitBreakdownRow[]>();
  for (const row of rows) {
    const list = byTaskGroup.get(row.taskGroupName) ?? [];
    list.push(row);
    byTaskGroup.set(row.taskGroupName, list);
  }
  return Array.from(byTaskGroup.entries());
}

export function UnitBreakdownAccordion({ rows }: { rows: UnitBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No units logged yet.</p>;
  }

  const byJtf = new Map<string, UnitBreakdownRow[]>();
  for (const row of rows) {
    const list = byJtf.get(row.jtfName) ?? [];
    list.push(row);
    byJtf.set(row.jtfName, list);
  }
  const groups = Array.from(byJtf.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Accordion multiple>
      {groups.map(([jtfName, jtfRows]) => {
        return (
          <AccordionItem key={jtfName} value={jtfName}>
            <AccordionTrigger>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2 text-left text-sm">
                <span className="font-medium">{jtfName}</span>
                <span className="text-xs text-muted-foreground">units: {jtfRows.length}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3 text-sm">
                {groupByTaskGroup(jtfRows).map(([taskGroupName, tgRows]) => (
                  <div key={taskGroupName} className="rounded-md border border-border p-3">
                    <div className="mb-2 font-display text-xs font-semibold tracking-widest text-primary uppercase">
                      {taskGroupName}
                    </div>
                    <div className="flex flex-col gap-1">
                      {tgRows.map((row, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{row.unitName}</span>
                          <span className="font-mono tabular-nums">{row.strength.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

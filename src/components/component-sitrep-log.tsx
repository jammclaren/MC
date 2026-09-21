"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ComponentSitRepRow } from "@/lib/queries/component-sitreps";

export function ComponentSitRepLog({ rows }: { rows: ComponentSitRepRow[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No SITREPs logged yet.</p>;
  }

  return (
    <Accordion multiple>
      {rows.map((row) => (
        <AccordionItem key={row.id} value={row.id}>
          <AccordionTrigger>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2 text-left text-sm">
              <span className="font-medium">
                {row.component === "AIR" ? "Air" : "Naval"} · Total Assets: {row.totalAssets.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">{row.reportedAt.toLocaleString()}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3 text-sm">
              <div className="text-xs text-muted-foreground">Logged by {row.createdByName}</div>
              {row.units.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Unit / Strength</span>
                  {row.units.map((u, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>{u.unitName}</span>
                      <span className="font-mono tabular-nums">{u.strength.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {row.assets.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">Breakdown</span>
                  {row.assets.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-muted-foreground">
                      <span>{a.assetName}</span>
                      <span className="font-mono tabular-nums">{a.number.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {row.units.length === 0 && row.assets.length === 0 && (
                <p className="text-muted-foreground">No entries.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

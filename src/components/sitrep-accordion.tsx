"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import type { SitRepRow } from "@/lib/queries/sitreps";

export function SitRepAccordion({ rows }: { rows: SitRepRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">No SITREPs logged yet.</p>
    );
  }

  return (
    <Accordion multiple>
      {rows.map((row) => {
        const totalStrength = row.taskGroups.reduce(
          (sum, tg) => sum + tg.units.reduce((s, u) => s + u.strength, 0),
          0
        );
        return (
          <AccordionItem key={row.id} value={row.id}>
            <AccordionTrigger>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-2 text-left text-sm">
                <span className="font-medium">{row.jtfName}</span>
                <span className="text-xs text-muted-foreground">
                  {totalStrength.toLocaleString()} strength · {row.taskGroups.length} task group
                  {row.taskGroups.length === 1 ? "" : "s"} · {row.reportedAt.toLocaleString()}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-4 text-sm">
                <div className="text-xs text-muted-foreground">
                  Logged by {row.createdByName} · {row.reportedAt.toLocaleString()}
                </div>

                {row.taskGroups.map((tg, i) => (
                  <div key={i} className="rounded-md border border-border p-3">
                    <div className="mb-2 font-display text-xs font-semibold tracking-widest text-primary uppercase">
                      {tg.name}
                    </div>
                    {tg.units.length > 0 && (
                      <div className="mb-2 flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground">Units / Strength</div>
                        {tg.units.map((u, j) => (
                          <div key={j} className="flex justify-between">
                            <span>{u.unitName}</span>
                            <span className="font-mono tabular-nums">{u.strength.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {tg.criticalAssets.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground">Critical Assets</div>
                        <div className="flex flex-wrap gap-1">
                          {tg.criticalAssets.map((a, j) => (
                            <Badge key={j} variant="outline">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Checkpoint Operations (Total)</span>
                  <span className="font-mono tabular-nums">{row.checkpointOpsTotal.toLocaleString()}</span>
                </div>
                {row.checkpointBreakdown.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {row.checkpointBreakdown.map((c, i) => (
                      <div key={i} className="flex flex-wrap justify-between gap-x-3 text-xs">
                        <span className="font-mono uppercase">{c.location}</span>
                        <span>{c.unit}</span>
                        <span className="text-muted-foreground">{c.remarks ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {row.armedEngagement && (
                  <div className="rounded-md border border-status-critical/30 bg-status-critical/5 p-3">
                    <div className="mb-1 font-display text-xs font-semibold tracking-widest text-status-critical uppercase">
                      Armed Engagement
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Unit Involved</dt>
                      <dd>{row.armedEngagement.unitInvolved}</dd>
                      <dt className="text-muted-foreground">Confronted Threat</dt>
                      <dd>{row.armedEngagement.confrontedThreat}</dd>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd>{row.armedEngagement.location}</dd>
                      <dt className="text-muted-foreground">Results</dt>
                      <dd>{row.armedEngagement.results}</dd>
                    </dl>
                  </div>
                )}

                {row.significantActivities.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">
                      Other Significant Activities
                    </div>
                    <ol className="list-decimal pl-5 text-xs">
                      {row.significantActivities.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {row.canDelete && (
                  <div className="flex justify-end">
                    <DeleteButton
                      url={`/api/sitreps/${row.id}`}
                      confirmMessage="Delete this SITREP? This cannot be undone."
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

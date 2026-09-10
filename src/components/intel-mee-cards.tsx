"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntelMeeFormDialog, type JtfOption } from "@/components/intel-mee-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import type { IntelMeeAssetRow } from "@/lib/queries/intel-mee";
import { TOW_WESTMIN_LABEL } from "@/lib/intel-suggestions";

const TOW_WESTMIN_KEY = "__tow_westmin__";

interface JtfGroup {
  jtfId: string | null;
  jtfName: string;
  rows: IntelMeeAssetRow[];
}

/** One card per JTF, same grid/layout convention as the BPE Deployment
 * page's per-JTF recap cards — every JTF always gets a card (even with
 * zero entries), rather than an accordion you have to open to see
 * anything is (or isn't) on file. */
export function IntelMeeCards({
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
    for (const jtf of jtfOptions) {
      map.set(jtf.id, { jtfId: jtf.id, jtfName: jtf.name, rows: [] });
    }
    map.set(TOW_WESTMIN_KEY, { jtfId: null, jtfName: TOW_WESTMIN_LABEL, rows: [] });
    for (const row of rows) {
      const key = row.jtfId ?? TOW_WESTMIN_KEY;
      const existing = map.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(key, { jtfId: row.jtfId, jtfName: row.jtfName, rows: [row] });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.jtfName.localeCompare(b.jtfName));
  }, [rows, jtfOptions]);

  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No JTFs on file yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {groups.map((group) => (
        <Card key={group.jtfId ?? TOW_WESTMIN_KEY}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{group.jtfName}</CardTitle>
              <Badge variant="outline">{group.rows.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {group.rows.length === 0 && (
              <p className="text-xs text-muted-foreground">No entries yet.</p>
            )}
            {group.rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-1 rounded-md border border-border p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium break-words">{row.name}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    ×{row.quantity.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground break-words">{row.assetType}</span>
                {canWrite && (
                  <div className="flex justify-end gap-1 border-t border-border/60 pt-1">
                    <IntelMeeFormDialog
                      jtfOptions={jtfOptions}
                      lockJtfId={group.jtfId}
                      initial={{
                        id: row.id,
                        jtfId: row.jtfId,
                        name: row.name,
                        assetType: row.assetType,
                        quantity: row.quantity,
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
                )}
              </div>
            ))}
            {canWrite && (
              <IntelMeeFormDialog
                jtfOptions={jtfOptions}
                lockJtfId={group.jtfId}
                trigger={
                  <Button variant="outline" size="sm" className="self-start">
                    Add
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

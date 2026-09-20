"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UNIT_CONDITION_CATEGORIES, ratingForPct } from "@/lib/unit-condition";
import type { UnitConditionRow } from "@/lib/queries/unit-conditions";

type RowState = Record<(typeof UNIT_CONDITION_CATEGORIES)[number]["key"], string>;

function toRowState(row: UnitConditionRow): RowState {
  return {
    personnelPct: String(row.personnelPct),
    equipmentPct: String(row.equipmentPct),
    maintenancePct: String(row.maintenancePct),
    facilityPct: String(row.facilityPct),
    trainingPct: String(row.trainingPct),
  };
}

/** ADMIN-only editable Unit Condition form — one row per JTF, five 0-100
 * percentage inputs each. Saved independently per JTF rather than one
 * big form submit, since these are usually updated one unit at a time. */
export function UnitConditionCard({ rows }: { rows: UnitConditionRow[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(rows.map((row) => [row.jtfId, toRowState(row)]))
  );
  const [savingJtfId, setSavingJtfId] = useState<string | null>(null);

  function setField(jtfId: string, key: keyof RowState, raw: string) {
    setValues((prev) => ({ ...prev, [jtfId]: { ...prev[jtfId], [key]: raw } }));
  }

  async function save(jtfId: string) {
    const row = values[jtfId];
    const parsed: Record<string, number> = {};
    for (const cat of UNIT_CONDITION_CATEGORIES) {
      const n = Number(row[cat.key]);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        toast.error(`${cat.label} must be a whole number from 0 to 100`);
        return;
      }
      parsed[cat.key] = n;
    }

    setSavingJtfId(jtfId);
    try {
      const res = await fetch("/api/unit-conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jtfId, ...parsed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save Unit Condition");
      }
      toast.success("Unit Condition saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSavingJtfId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Condition</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {rows.map((row) => {
          const state = values[row.jtfId];
          const previewPct = Math.round(
            UNIT_CONDITION_CATEGORIES.reduce((sum, cat) => sum + (Number(state[cat.key]) || 0), 0) /
              UNIT_CONDITION_CATEGORIES.length
          );
          const rating = ratingForPct(previewPct);
          return (
            <div key={row.jtfId} className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-semibold tracking-wide uppercase">
                  {row.jtfName}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: `color-mix(in oklch, ${rating.color}, transparent 80%)`, color: rating.color }}
                >
                  {rating.code} · {rating.label} · {previewPct}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {UNIT_CONDITION_CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex flex-col gap-1">
                    <Label htmlFor={`${row.jtfId}-${cat.key}`} className="text-xs">
                      {cat.label}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`${row.jtfId}-${cat.key}`}
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={state[cat.key]}
                        onChange={(e) => setField(row.jtfId, cat.key, e.target.value)}
                        className="h-8"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {row.updatedAt
                    ? `Last updated ${row.updatedAt.toLocaleDateString()}`
                    : "Not set yet"}
                </span>
                <Button
                  size="sm"
                  onClick={() => save(row.jtfId)}
                  disabled={savingJtfId === row.jtfId}
                >
                  {savingJtfId === row.jtfId ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

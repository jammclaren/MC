"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UNIT_CONDITION_CATEGORIES, ratingForPct } from "@/lib/unit-condition";
import type { UnitConditionJtfGroup, UnitConditionTaskGroupRow } from "@/lib/queries/unit-conditions";

type RowState = Record<(typeof UNIT_CONDITION_CATEGORIES)[number]["key"], string>;

function toRowState(row: UnitConditionTaskGroupRow): RowState {
  return {
    personnelPct: String(row.personnelPct),
    equipmentPct: String(row.equipmentPct),
    maintenancePct: String(row.maintenancePct),
    facilityPct: String(row.facilityPct),
    trainingPct: String(row.trainingPct),
  };
}

function stateKey(jtfId: string, taskGroupName: string) {
  return `${jtfId}::${taskGroupName}`;
}

/** Editable Unit Condition form — one section per JTF, one row of five
 * 0-100 percentage inputs per Task Group that JTF currently has (per its
 * most recent SitRep). Saved independently per task group rather than
 * one big form submit, since these are usually updated one unit at a
 * time. RBAC (assertCanWriteJtf) is enforced server-side; this page is
 * ADMIN-only, so every save here is an ADMIN acting on any JTF's behalf. */
export function UnitConditionCard({ groups }: { groups: UnitConditionJtfGroup[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      groups.flatMap((g) =>
        g.taskGroups.map((tg) => [stateKey(g.jtfId, tg.taskGroupName), toRowState(tg)])
      )
    )
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function setField(key: string, field: keyof RowState, raw: string) {
    setValues((prev) => ({ ...prev, [key]: { ...prev[key], [field]: raw } }));
  }

  async function save(jtfId: string, taskGroupName: string) {
    const key = stateKey(jtfId, taskGroupName);
    const row = values[key];
    const parsed: Record<string, number> = {};
    for (const cat of UNIT_CONDITION_CATEGORIES) {
      const n = Number(row[cat.key]);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        toast.error(`${cat.label} must be a whole number from 0 to 100`);
        return;
      }
      parsed[cat.key] = n;
    }

    setSavingKey(key);
    try {
      const res = await fetch("/api/unit-conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jtfId, taskGroupName, ...parsed }),
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
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Condition</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.jtfId} className="flex flex-col gap-3">
            <span className="font-display text-sm font-semibold tracking-wide uppercase">
              {group.jtfName}
            </span>
            {group.taskGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No task groups reported yet — submit a Daily SITREP for this JTF first.
              </p>
            ) : (
              group.taskGroups.map((tg) => {
                const key = stateKey(group.jtfId, tg.taskGroupName);
                const state = values[key];
                const previewPct = Math.round(
                  UNIT_CONDITION_CATEGORIES.reduce(
                    (sum, cat) => sum + (Number(state[cat.key]) || 0),
                    0
                  ) / UNIT_CONDITION_CATEGORIES.length
                );
                const rating = ratingForPct(previewPct);
                return (
                  <div key={key} className="flex flex-col gap-3 rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{tg.taskGroupName}</span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${rating.color}, transparent 80%)`,
                          color: rating.color,
                        }}
                      >
                        {rating.code} · {rating.label} · {previewPct}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {UNIT_CONDITION_CATEGORIES.map((cat) => (
                        <div key={cat.key} className="flex flex-col gap-1">
                          <Label htmlFor={`${key}-${cat.key}`} className="text-xs">
                            {cat.label}
                          </Label>
                          <div className="flex items-center gap-1">
                            <Input
                              id={`${key}-${cat.key}`}
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={state[cat.key]}
                              onChange={(e) => setField(key, cat.key, e.target.value)}
                              className="h-8"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {tg.updatedAt ? `Last updated ${tg.updatedAt.toLocaleDateString()}` : "Not set yet"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => save(group.jtfId, tg.taskGroupName)}
                        disabled={savingKey === key}
                      >
                        {savingKey === key ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

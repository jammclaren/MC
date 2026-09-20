"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { UNIT_CONDITION_CATEGORIES, ratingForPct } from "@/lib/unit-condition";
import type { UnitConditionJtfGroup, UnitConditionTaskGroupRow } from "@/lib/queries/unit-conditions";

type PctState = Record<(typeof UNIT_CONDITION_CATEGORIES)[number]["key"], string>;

/** A row's editable state — name is tracked separately from the pcts so a
 * rename can be saved (or reverted by re-typing) independent of ratings.
 * originalName is the name the row is currently saved under (undefined
 * for a brand-new, not-yet-saved row), used as the upsert lookup key so
 * editing the name field doesn't lose track of which row to update. */
interface RowState {
  name: string;
  originalName?: string;
  pcts: PctState;
}

let nextDraftId = 0;

function zeroPcts(): PctState {
  return { personnelPct: "0", equipmentPct: "0", maintenancePct: "0", facilityPct: "0", trainingPct: "0" };
}

function toPctState(row: UnitConditionTaskGroupRow): PctState {
  return {
    personnelPct: String(row.personnelPct),
    equipmentPct: String(row.equipmentPct),
    maintenancePct: String(row.maintenancePct),
    facilityPct: String(row.facilityPct),
    trainingPct: String(row.trainingPct),
  };
}

/** Editable Unit Condition form — one section per JTF, one card per Task
 * Group with an editable name plus five 0-100 percentage inputs. Task
 * Groups can be renamed and new ones added per JTF; saved independently
 * per task group rather than one big form submit. RBAC (assertCanWriteJtf)
 * is enforced server-side. */
export function UnitConditionCard({ groups }: { groups: UnitConditionJtfGroup[] }) {
  const router = useRouter();
  const [rowsByJtf, setRowsByJtf] = useState<Record<string, Record<string, RowState>>>(() =>
    Object.fromEntries(
      groups.map((g) => [
        g.jtfId,
        Object.fromEntries(
          g.taskGroups.map((tg) => [
            tg.id,
            { name: tg.taskGroupName, originalName: tg.taskGroupName, pcts: toPctState(tg) },
          ])
        ),
      ])
    )
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function setRow(jtfId: string, rowId: string, patch: Partial<RowState>) {
    setRowsByJtf((prev) => ({
      ...prev,
      [jtfId]: { ...prev[jtfId], [rowId]: { ...prev[jtfId][rowId], ...patch } },
    }));
  }

  function setPct(jtfId: string, rowId: string, field: keyof PctState, raw: string) {
    setRowsByJtf((prev) => ({
      ...prev,
      [jtfId]: {
        ...prev[jtfId],
        [rowId]: { ...prev[jtfId][rowId], pcts: { ...prev[jtfId][rowId].pcts, [field]: raw } },
      },
    }));
  }

  function addTaskGroup(jtfId: string) {
    const draftId = `draft-${nextDraftId++}`;
    setRowsByJtf((prev) => ({
      ...prev,
      [jtfId]: { ...prev[jtfId], [draftId]: { name: "", pcts: zeroPcts() } },
    }));
  }

  async function save(jtfId: string, rowId: string) {
    const key = `${jtfId}::${rowId}`;
    const row = rowsByJtf[jtfId][rowId];
    const name = row.name.trim();
    if (!name) {
      toast.error("Task Group name can't be empty");
      return;
    }
    const parsed: Record<string, number> = {};
    for (const cat of UNIT_CONDITION_CATEGORIES) {
      const n = Number(row.pcts[cat.key]);
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
        body: JSON.stringify({
          jtfId,
          taskGroupName: name,
          originalTaskGroupName: row.originalName,
          ...parsed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save Unit Condition");
      }
      toast.success(row.originalName ? "Task Group saved" : "Task Group added");
      // router.refresh() re-fetches server data but this component's
      // state was only seeded from props on mount, so it won't pick up
      // the save on its own — mark this row as now-saved locally too, or
      // it keeps reading "not saved yet" until a full page reload.
      setRow(jtfId, rowId, { originalName: name });
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
        <CardTitle>Unit Readiness Condition</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {groups.map((group) => {
          const rows = rowsByJtf[group.jtfId] ?? {};
          const rowIds = Object.keys(rows);
          return (
            <div key={group.jtfId} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-semibold tracking-wide uppercase">
                  {group.jtfName}
                </span>
                <Button variant="outline" size="sm" onClick={() => addTaskGroup(group.jtfId)}>
                  <Plus data-icon="inline-start" />
                  Add Task Group
                </Button>
              </div>
              {rowIds.length === 0 && (
                <p className="text-sm text-muted-foreground">No task groups yet.</p>
              )}
              {rowIds.map((rowId) => {
                const row = rows[rowId];
                const key = `${group.jtfId}::${rowId}`;
                const previewPct = Math.round(
                  UNIT_CONDITION_CATEGORIES.reduce(
                    (sum, cat) => sum + (Number(row.pcts[cat.key]) || 0),
                    0
                  ) / UNIT_CONDITION_CATEGORIES.length
                );
                const rating = ratingForPct(previewPct);
                return (
                  <div key={rowId} className="flex flex-col gap-3 rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Input
                        value={row.name}
                        onChange={(e) => setRow(group.jtfId, rowId, { name: e.target.value })}
                        placeholder="Task Group name, e.g. TG UNIFIER"
                        className="h-8 max-w-xs"
                      />
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
                              value={row.pcts[cat.key]}
                              onChange={(e) => setPct(group.jtfId, rowId, cat.key, e.target.value)}
                              className="h-8"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {row.originalName ? "Editing existing Task Group" : "New Task Group — not saved yet"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => save(group.jtfId, rowId)}
                        disabled={savingKey === key}
                      >
                        {savingKey === key ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

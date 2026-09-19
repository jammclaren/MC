"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface JtfOption {
  id: string;
  name: string;
}

interface TaskGroupUnitForm {
  unitName: string;
  strength: string;
}

interface TaskGroupForm {
  name: string;
  units: TaskGroupUnitForm[];
  criticalAssets: string[];
}

interface CheckpointOpForm {
  location: string;
  unit: string;
  remarks: string;
}

const emptyTaskGroup = (): TaskGroupForm => ({
  name: "",
  units: [{ unitName: "", strength: "" }],
  criticalAssets: [""],
});

export function SitRepFormDialog({
  jtfOptions,
  lockJtfId,
  trigger,
}: {
  jtfOptions: JtfOption[];
  lockJtfId?: string;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jtfId, setJtfId] = useState(lockJtfId ?? jtfOptions[0]?.id ?? "");
  const [taskGroups, setTaskGroups] = useState<TaskGroupForm[]>([emptyTaskGroup()]);
  const [checkpointOpsTotal, setCheckpointOpsTotal] = useState("");
  const [checkpointBreakdown, setCheckpointBreakdown] = useState<CheckpointOpForm[]>([]);
  const [includeArmedEngagement, setIncludeArmedEngagement] = useState(false);
  const [unitInvolved, setUnitInvolved] = useState("");
  const [confrontedThreat, setConfrontedThreat] = useState("");
  const [engagementLocation, setEngagementLocation] = useState("");
  const [results, setResults] = useState("");
  const [significantActivities, setSignificantActivities] = useState<string[]>([""]);

  const jtfItems = jtfOptions.map((jtf) => ({ value: jtf.id, label: jtf.name }));

  function updateTaskGroup(index: number, patch: Partial<TaskGroupForm>) {
    setTaskGroups((prev) => prev.map((tg, i) => (i === index ? { ...tg, ...patch } : tg)));
  }
  function addTaskGroup() {
    setTaskGroups((prev) => [...prev, emptyTaskGroup()]);
  }
  function removeTaskGroup(index: number) {
    setTaskGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function updateUnit(tgIndex: number, uIndex: number, patch: Partial<TaskGroupUnitForm>) {
    setTaskGroups((prev) =>
      prev.map((tg, i) =>
        i === tgIndex
          ? { ...tg, units: tg.units.map((u, j) => (j === uIndex ? { ...u, ...patch } : u)) }
          : tg
      )
    );
  }
  function addUnit(tgIndex: number) {
    setTaskGroups((prev) =>
      prev.map((tg, i) =>
        i === tgIndex ? { ...tg, units: [...tg.units, { unitName: "", strength: "" }] } : tg
      )
    );
  }
  function removeUnit(tgIndex: number, uIndex: number) {
    setTaskGroups((prev) =>
      prev.map((tg, i) =>
        i === tgIndex ? { ...tg, units: tg.units.filter((_, j) => j !== uIndex) } : tg
      )
    );
  }

  function updateCriticalAsset(tgIndex: number, aIndex: number, value: string) {
    setTaskGroups((prev) =>
      prev.map((tg, i) =>
        i === tgIndex
          ? { ...tg, criticalAssets: tg.criticalAssets.map((a, j) => (j === aIndex ? value : a)) }
          : tg
      )
    );
  }
  function addCriticalAsset(tgIndex: number) {
    setTaskGroups((prev) =>
      prev.map((tg, i) => (i === tgIndex ? { ...tg, criticalAssets: [...tg.criticalAssets, ""] } : tg))
    );
  }
  function removeCriticalAsset(tgIndex: number, aIndex: number) {
    setTaskGroups((prev) =>
      prev.map((tg, i) =>
        i === tgIndex
          ? { ...tg, criticalAssets: tg.criticalAssets.filter((_, j) => j !== aIndex) }
          : tg
      )
    );
  }

  function updateCheckpointRow(index: number, patch: Partial<CheckpointOpForm>) {
    setCheckpointBreakdown((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  function addCheckpointRow() {
    setCheckpointBreakdown((prev) => [...prev, { location: "", unit: "", remarks: "" }]);
  }
  function removeCheckpointRow(index: number) {
    setCheckpointBreakdown((prev) => prev.filter((_, i) => i !== index));
  }

  function updateActivity(index: number, value: string) {
    setSignificantActivities((prev) => prev.map((a, i) => (i === index ? value : a)));
  }
  function addActivity() {
    setSignificantActivities((prev) => [...prev, ""]);
  }
  function removeActivity(index: number) {
    setSignificantActivities((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setTaskGroups([emptyTaskGroup()]);
    setCheckpointOpsTotal("");
    setCheckpointBreakdown([]);
    setIncludeArmedEngagement(false);
    setUnitInvolved("");
    setConfrontedThreat("");
    setEngagementLocation("");
    setResults("");
    setSignificantActivities([""]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!jtfId) {
      toast.error("Select a JTF");
      return;
    }
    if (includeArmedEngagement && (!unitInvolved.trim() || !confrontedThreat.trim() || !engagementLocation.trim() || !results.trim())) {
      toast.error("Complete all Armed Engagement fields, or remove that section");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        jtfId,
        taskGroups: taskGroups
          .filter((tg) => tg.name.trim() !== "")
          .map((tg) => ({
            name: tg.name.trim(),
            units: tg.units
              .filter((u) => u.unitName.trim() !== "")
              .map((u) => ({ unitName: u.unitName.trim(), strength: Number(u.strength) || 0 })),
            criticalAssets: tg.criticalAssets.map((a) => a.trim()).filter((a) => a !== ""),
          })),
        checkpointOpsTotal: Number(checkpointOpsTotal) || 0,
        checkpointBreakdown: checkpointBreakdown
          .filter((c) => c.location.trim() !== "" || c.unit.trim() !== "")
          .map((c) => ({
            location: c.location.trim(),
            unit: c.unit.trim(),
            remarks: c.remarks.trim() || undefined,
          })),
        armedEngagement: includeArmedEngagement
          ? {
              unitInvolved: unitInvolved.trim(),
              confrontedThreat: confrontedThreat.trim(),
              location: engagementLocation.trim(),
              results: results.trim(),
            }
          : null,
        significantActivities: significantActivities.map((a) => a.trim()).filter((a) => a !== ""),
      };

      const res = await fetch("/api/sitreps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success("SITREP logged");
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log SITREP</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col gap-6 overflow-y-auto py-4 pr-1">
            {!lockJtfId && (
              <div className="flex flex-col gap-2">
                <Label>JTF</Label>
                <Select items={jtfItems} value={jtfId} onValueChange={(v: string | null) => setJtfId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select JTF" />
                  </SelectTrigger>
                  <SelectContent>
                    {jtfOptions.map((jtf) => (
                      <SelectItem key={jtf.id} value={jtf.id}>
                        {jtf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task Groups */}
            <div className="flex flex-col gap-4">
              {taskGroups.map((tg, tgIndex) => (
                <div key={tgIndex} className="flex flex-col gap-3 rounded-md border border-border p-3">
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label htmlFor={`tg-name-${tgIndex}`}>Task Group</Label>
                      <Input
                        id={`tg-name-${tgIndex}`}
                        placeholder="e.g. TG UNIFIER"
                        value={tg.name}
                        onChange={(e) => updateTaskGroup(tgIndex, { name: e.target.value })}
                      />
                    </div>
                    {taskGroups.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTaskGroup(tgIndex)}>
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground">Units / Strength</Label>
                    {tg.units.map((u, uIndex) => (
                      <div key={uIndex} className="flex items-center gap-2">
                        <Input
                          placeholder="e.g. 40IB"
                          value={u.unitName}
                          onChange={(e) => updateUnit(tgIndex, uIndex, { unitName: e.target.value })}
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="Strength"
                          className="w-28"
                          value={u.strength}
                          onChange={(e) => updateUnit(tgIndex, uIndex, { strength: e.target.value })}
                        />
                        {tg.units.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeUnit(tgIndex, uIndex)}>
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => addUnit(tgIndex)}>
                      + Add Unit
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground">Critical Assets</Label>
                    {tg.criticalAssets.map((asset, aIndex) => (
                      <div key={aIndex} className="flex items-center gap-2">
                        <Input
                          placeholder="e.g. 6FAB"
                          value={asset}
                          onChange={(e) => updateCriticalAsset(tgIndex, aIndex, e.target.value)}
                        />
                        {tg.criticalAssets.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeCriticalAsset(tgIndex, aIndex)}>
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => addCriticalAsset(tgIndex)}>
                      + Add Critical Asset
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={addTaskGroup}>
                + Add Task Group
              </Button>
            </div>

            {/* Checkpoint Operations */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="checkpointOpsTotal">Nr of Checkpoint Operations (Total)</Label>
              <Input
                id="checkpointOpsTotal"
                type="number"
                min={0}
                className="w-32"
                value={checkpointOpsTotal}
                onChange={(e) => setCheckpointOpsTotal(e.target.value)}
              />
              <Label className="text-xs text-muted-foreground">Breakdown</Label>
              {checkpointBreakdown.map((c, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Location (MGRS)"
                    className="font-mono uppercase"
                    value={c.location}
                    onChange={(e) => updateCheckpointRow(index, { location: e.target.value })}
                  />
                  <Input
                    placeholder="Unit"
                    value={c.unit}
                    onChange={(e) => updateCheckpointRow(index, { unit: e.target.value })}
                  />
                  <Input
                    placeholder="Remarks"
                    value={c.remarks}
                    onChange={(e) => updateCheckpointRow(index, { remarks: e.target.value })}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCheckpointRow(index)}>
                    ×
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={addCheckpointRow}>
                + Add Checkpoint
              </Button>
            </div>

            {/* Activities */}
            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label>Armed Engagement (Gov&apos;t vs Threat Group)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIncludeArmedEngagement((v) => !v)}
                >
                  {includeArmedEngagement ? "Remove" : "+ Add"}
                </Button>
              </div>
              {includeArmedEngagement && (
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Unit Involved"
                    value={unitInvolved}
                    onChange={(e) => setUnitInvolved(e.target.value)}
                  />
                  <Input
                    placeholder="Confronted Threat"
                    value={confrontedThreat}
                    onChange={(e) => setConfrontedThreat(e.target.value)}
                  />
                  <Input
                    placeholder="Location"
                    value={engagementLocation}
                    onChange={(e) => setEngagementLocation(e.target.value)}
                  />
                  <Textarea
                    placeholder="Results"
                    value={results}
                    onChange={(e) => setResults(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Other Significant Activities</Label>
              {significantActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-sm text-muted-foreground">{index + 1}.</span>
                  <Input value={activity} onChange={(e) => updateActivity(index, e.target.value)} />
                  {significantActivities.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeActivity(index)}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={addActivity}>
                + Add Activity
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Log SITREP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

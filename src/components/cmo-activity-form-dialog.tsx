"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { forward } from "mgrs";
import { toast } from "sonner";
import { parseMgrs } from "@/lib/mgrs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import type { CmoActivityCategory } from "@/lib/queries/cmo-activities";
import { CMO_CATEGORY_LABELS } from "@/lib/cmo-activity-assessment";

const CATEGORIES: CmoActivityCategory[] = ["PUBLIC_AFFAIRS", "CIVIL_AFFAIRS", "PSYOPS", "IEC"];

export interface CmoActivityFormInitial {
  id: string;
  category: CmoActivityCategory;
  title: string;
  narrative: string;
  lat: number;
  lng: number;
  locationLabel: string;
  date: string;
}

export function CmoActivityFormDialog({
  initial,
  trigger,
}: {
  initial?: CmoActivityFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<CmoActivityCategory>(initial?.category ?? "PUBLIC_AFFAIRS");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [narrative, setNarrative] = useState(initial?.narrative ?? "");
  const [mgrsInput, setMgrsInput] = useState(
    initial ? forward([initial.lng, initial.lat]) : ""
  );
  const [locationLabel, setLocationLabel] = useState(initial?.locationLabel ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));

  const parsed = useMemo(() => parseMgrs(mgrsInput), [mgrsInput]);
  const categoryItems = useMemo(
    () => CATEGORIES.map((c) => ({ value: c, label: CMO_CATEGORY_LABELS[c] })),
    []
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/cmo-activities/${initial!.id}` : "/api/cmo-activities";
      const method = isEdit ? "PATCH" : "POST";
      const body = {
        category,
        title,
        narrative,
        locationLabel,
        mgrs: mgrsInput,
        date,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Activity updated" : "Activity logged");
      setOpen(false);
      if (!isEdit) {
        setCategory("PUBLIC_AFFAIRS");
        setTitle("");
        setNarrative("");
        setMgrsInput("");
        setLocationLabel("");
      }
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit" : "Log"} CMO Activity</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select
                items={categoryItems}
                value={category}
                onValueChange={(v: string | null) => v && setCategory(v as CmoActivityCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CMO_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                placeholder="e.g. Barangay Peace Dialogue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="narrative">Narrative</Label>
              <Textarea
                id="narrative"
                required
                rows={3}
                maxLength={4000}
                placeholder="What was conducted/observed"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mgrs">Grid Coordinates (MGRS)</Label>
              <Input
                id="mgrs"
                required
                placeholder="e.g. 51NUA6789054321"
                className="font-mono uppercase"
                value={mgrsInput}
                onChange={(e) => setMgrsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {"error" in parsed
                  ? mgrsInput.trim() && <span className="text-status-critical">{parsed.error}</span>
                  : `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="locationLabel">Location</Label>
              <Input
                id="locationLabel"
                required
                placeholder="e.g. Brgy Libertad, Kolambugan, Lanao del Norte"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Log activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

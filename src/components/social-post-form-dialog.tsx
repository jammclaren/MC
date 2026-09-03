"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { classifyPostContent } from "@/lib/social-classifier";

export interface SocialPostFormInitial {
  id: string;
  pageName: string;
  authorName: string;
  content: string;
  postUrl: string;
  postedAt: string; // yyyy-MM-ddThh:mm, for <input type="datetime-local">
  classification: string; // "VIOLENT" | "NON_VIOLENT" | ""
  isHighlighted: boolean;
  sourceNote: string;
}

export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const CLASSIFICATION_OPTIONS = [
  { value: "__unset__", label: "Unclassified" },
  { value: "VIOLENT", label: "Violent" },
  { value: "NON_VIOLENT", label: "Non-Violent" },
];

export function SocialPostFormDialog({
  initial,
  trigger,
}: {
  initial?: SocialPostFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageName, setPageName] = useState(initial?.pageName ?? "");
  const [authorName, setAuthorName] = useState(initial?.authorName ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [postUrl, setPostUrl] = useState(initial?.postUrl ?? "");
  const [postedAt, setPostedAt] = useState(initial?.postedAt ?? toLocalInputValue(new Date()));
  const [classification, setClassification] = useState(initial?.classification || "__unset__");
  const [isHighlighted, setIsHighlighted] = useState(initial?.isHighlighted ?? false);
  const [sourceNote, setSourceNote] = useState(initial?.sourceNote ?? "");
  const [classificationTouched, setClassificationTouched] = useState(isEdit);

  const classificationItems = useMemo(() => CLASSIFICATION_OPTIONS, []);

  function handleContentChange(value: string) {
    setContent(value);
    // Suggest a classification as staff type, same keyword pass the hourly
    // Facebook sync uses — never overrides a choice staff already made.
    if (!classificationTouched && value.trim().length > 0) {
      setClassification(classifyPostContent(value));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/social-posts/${initial!.id}` : "/api/social-posts";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageName: pageName.trim(),
          authorName: authorName.trim() || null,
          content: content.trim(),
          postUrl: postUrl.trim() || null,
          postedAt: new Date(postedAt).toISOString(),
          classification: classification === "__unset__" ? null : classification,
          isHighlighted,
          sourceNote: sourceNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "Post updated" : "Post logged");
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Post" : "Log Facebook Post"}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[65vh] grid-cols-2 gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pageName">Page / Group Name</Label>
              <Input
                id="pageName"
                required
                placeholder="e.g. Cotabato News Watch"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="authorName">Author (optional)</Label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="content">Post Content</Label>
              <Textarea
                id="content"
                required
                rows={4}
                maxLength={4000}
                placeholder="Paste or summarize the post text"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="postUrl">Post URL (optional)</Label>
              <Input
                id="postUrl"
                type="url"
                placeholder="https://facebook.com/..."
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="postedAt">Posted At</Label>
              <Input
                id="postedAt"
                type="datetime-local"
                required
                value={postedAt}
                onChange={(e) => setPostedAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Classification</Label>
              <Select
                items={classificationItems}
                value={classification}
                onValueChange={(v: string | null) => {
                  setClassificationTouched(true);
                  setClassification(v ?? "__unset__");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                checked={isHighlighted}
                onChange={(e) => setIsHighlighted(e.target.checked)}
              />
              Highlight as significant activity/incident
            </label>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="sourceNote">Source Note (optional)</Label>
              <Input
                id="sourceNote"
                placeholder="e.g. Reported by JTF ORION S2, forwarded via CMO"
                value={sourceNote}
                onChange={(e) => setSourceNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Log post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

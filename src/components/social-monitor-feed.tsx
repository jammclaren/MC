"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { SocialPostFormDialog, toLocalInputValue } from "@/components/social-post-form-dialog";
import { cn } from "@/lib/utils";
import { TOPIC_LABELS, TOPIC_OPTIONS } from "@/lib/social-classifier";
import type { SocialPostTopic } from "@/generated/prisma/client";
import { currentReportWindow } from "@/lib/reporting-period";

export interface SocialMonitorPost {
  id: string;
  pageName: string;
  authorName: string | null;
  content: string;
  postUrl: string | null;
  postedAt: string; // ISO
  classification: string | null;
  topic: string | null;
  isHighlighted: boolean;
  sourceNote: string | null;
  externalPostId: string | null;
  createdAt: string; // ISO — when this row was logged, drives the
  // 2200H-2200H reporting-period cutoff below
}

type FilterKey = "all" | "unspecified" | SocialPostTopic;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  ...TOPIC_OPTIONS.map((o) => ({ key: o.value as FilterKey, label: o.label })),
  { key: "unspecified", label: "Unspecified" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SocialMonitorFeed({
  posts,
  canWrite,
}: {
  posts: SocialMonitorPost[];
  canWrite: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showHistory, setShowHistory] = useState(false);

  const { start: windowStart, end: windowEnd } = useMemo(() => currentReportWindow(), []);

  const historyCount = useMemo(() => {
    return posts.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      return t < windowStart.getTime() || t >= windowEnd.getTime();
    }).length;
  }, [posts, windowStart, windowEnd]);

  const filtered = useMemo(() => {
    const byTopic =
      filter === "all"
        ? posts
        : filter === "unspecified"
          ? posts.filter((p) => !p.topic)
          : posts.filter((p) => p.topic === filter);
    if (showHistory) return byTopic;
    return byTopic.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      return t >= windowStart.getTime() && t < windowEnd.getTime();
    });
  }, [posts, filter, showHistory, windowStart, windowEnd]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              type="button"
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        {historyCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? "Hide History" : `View History (${historyCount})`}
          </Button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No posts match this filter yet.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((post) => (
          <div
            key={post.id}
            className={cn(
              "rounded-lg border p-4",
              post.isHighlighted ? "border-status-critical/40 bg-status-critical/5" : "border-border"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{post.pageName}</span>
                  {post.authorName && (
                    <span className="text-xs text-muted-foreground">· {post.authorName}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(post.postedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {post.isHighlighted && (
                  <Badge variant="critical">
                    <Flag className="size-3" /> Highlighted
                  </Badge>
                )}
                {post.classification === "VIOLENT" && <Badge variant="critical">Violent</Badge>}
                {post.classification === "NON_VIOLENT" && (
                  <Badge variant="good">Non-Violent</Badge>
                )}
                {!post.classification && <Badge variant="outline">Unclassified</Badge>}
                {post.topic && (
                  <Badge variant="secondary">
                    {TOPIC_LABELS[post.topic as SocialPostTopic] ?? post.topic}
                  </Badge>
                )}
                {!post.externalPostId && <Badge variant="outline">Manual Entry</Badge>}
              </div>
            </div>

            <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>

            {post.sourceNote && (
              <p className="mt-1 text-xs text-muted-foreground">Note: {post.sourceNote}</p>
            )}

            <div className="mt-3 flex items-center justify-between">
              {post.postUrl ? (
                <a
                  href={post.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View original post <ExternalLink className="size-3" />
                </a>
              ) : (
                <span />
              )}
              {canWrite && (
                <div className="flex gap-1">
                  <SocialPostFormDialog
                    initial={{
                      id: post.id,
                      pageName: post.pageName,
                      authorName: post.authorName ?? "",
                      content: post.content,
                      postUrl: post.postUrl ?? "",
                      postedAt: toLocalInputValue(new Date(post.postedAt)),
                      classification: post.classification ?? "",
                      topic: post.topic ?? "",
                      isHighlighted: post.isHighlighted,
                      sourceNote: post.sourceNote ?? "",
                    }}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <DeleteButton
                    url={`/api/social-posts/${post.id}`}
                    confirmMessage="Delete this post from the monitor? This cannot be undone."
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

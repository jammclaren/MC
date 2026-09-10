// Deterministic "Data Interpretation & Assessment" for the Social Media
// Monitor page — same no-fabrication stance as intel-assessment.ts /
// daily-assessment.ts: every line is a count, a threshold, or a
// verbatim-quoted field, never an NLP summary of a post's `content`.
import type { SocialMonitorData } from "@/lib/queries/social-monitor";
import { TOPIC_LABELS } from "@/lib/social-classifier";
import type { SocialPostTopic } from "@/generated/prisma/client";

const TREND_WINDOW_DAYS = 14;

export interface SocialMonitorAssessment {
  analysis: string[];
}

function trendFrom(posts: SocialMonitorData["posts"]): "increasing" | "decreasing" | "stable" {
  const now = Date.now();
  const halfMs = (TREND_WINDOW_DAYS / 2) * 24 * 60 * 60 * 1000;
  const windowMs = TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  let priorHalf = 0;
  let recentHalf = 0;
  for (const post of posts) {
    const age = now - post.postedAt.getTime();
    if (age < 0 || age > windowMs) continue;
    if (age <= halfMs) recentHalf += 1;
    else priorHalf += 1;
  }
  if (recentHalf > priorHalf) return "increasing";
  if (recentHalf < priorHalf) return "decreasing";
  return "stable";
}

function topByFrequency(values: string[], limit: number): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function computeSocialMonitorAssessment(data: SocialMonitorData): SocialMonitorAssessment {
  const analysis: string[] = [];
  const { posts, totalCount, violentCount, nonViolentCount, highlightedCount } = data;
  const unclassifiedCount = totalCount - violentCount - nonViolentCount;

  analysis.push(
    `${totalCount.toLocaleString()} post(s) on file — ${violentCount.toLocaleString()} violent, ${nonViolentCount.toLocaleString()} non-violent, ${unclassifiedCount.toLocaleString()} unclassified.`
  );

  analysis.push(
    highlightedCount > 0
      ? `${highlightedCount.toLocaleString()} post(s) flagged for review.`
      : "No posts currently flagged for review."
  );

  // The remaining lines are computed from `posts`, which is capped at the
  // 200 most recent (see getSocialMonitorData) — called out explicitly
  // rather than implying they cover the full on-file total above.
  if (posts.length > 0) {
    const trend = trendFrom(posts);
    analysis.push(`${TREND_WINDOW_DAYS}-day posting trend (most recent ${posts.length} shown) is ${trend}.`);

    const topPages = topByFrequency(
      posts.map((p) => p.pageName),
      3
    );
    analysis.push(
      `Most-active source page(s): ${topPages.map((p) => `${p.label} (${p.count})`).join(", ")}.`
    );

    const topTopics = topByFrequency(
      posts.map((p) => (p.topic ? (TOPIC_LABELS[p.topic as SocialPostTopic] ?? p.topic) : "Unspecified")),
      3
    );
    analysis.push(
      `Most-cited topic(s): ${topTopics.map((t) => `${t.label} (${t.count})`).join(", ")}.`
    );

    const autoCount = posts.filter((p) => p.externalPostId !== null).length;
    const manualCount = posts.length - autoCount;
    analysis.push(
      `Of the most recent ${posts.length} shown: ${autoCount.toLocaleString()} auto-fetched, ${manualCount.toLocaleString()} manually logged.`
    );

    const mostRecentHighlighted = posts.find((p) => p.isHighlighted);
    if (mostRecentHighlighted) {
      analysis.push(
        `Most recent flagged post: ${mostRecentHighlighted.pageName} on ${mostRecentHighlighted.postedAt.toLocaleDateString()}.`
      );
    }
  }

  return { analysis };
}

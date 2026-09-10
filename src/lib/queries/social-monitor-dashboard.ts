import { prisma } from "@/lib/prisma";
import { TOPIC_LABELS } from "@/lib/social-classifier";
import type { SocialPostTopic } from "@/generated/prisma/client";

export interface PostsByDayDatum {
  dayIndex: number; // 1-based day within the period, so two periods of
  // different real calendar dates can still be plotted on the same axis
  date: string; // YYYY-MM-DD, the actual calendar date this point covers
  count: number;
  highlightedCount: number;
}

export interface PeriodMetrics {
  totalCount: number;
  violentCount: number;
  nonViolentCount: number;
  unclassifiedCount: number;
  highlightedCount: number;
  autoCount: number;
  manualCount: number;
  // Blank/null topic excluded from this ranking, same rule the Intel
  // Update charts/assessment follow — a report with no topic on file
  // shouldn't be able to out-rank a real named topic.
  topicCounts: { label: string; count: number }[];
  postsByDay: PostsByDayDatum[];
}

export interface PeriodComparison {
  selected: PeriodMetrics;
  compared: PeriodMetrics;
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

async function computePeriodMetrics(start: Date, end: Date): Promise<PeriodMetrics> {
  const posts = await prisma.socialMediaPost.findMany({
    where: { postedAt: { gte: start, lt: end } },
    select: { postedAt: true, classification: true, topic: true, isHighlighted: true, externalPostId: true },
  });

  const violentCount = posts.filter((p) => p.classification === "VIOLENT").length;
  const nonViolentCount = posts.filter((p) => p.classification === "NON_VIOLENT").length;
  const unclassifiedCount = posts.length - violentCount - nonViolentCount;
  const highlightedCount = posts.filter((p) => p.isHighlighted).length;
  const autoCount = posts.filter((p) => p.externalPostId !== null).length;
  const manualCount = posts.length - autoCount;

  const topicCounts = topByFrequency(
    posts
      .filter((p) => !!p.topic)
      .map((p) => TOPIC_LABELS[p.topic as SocialPostTopic] ?? (p.topic as string)),
    10
  );

  const dayMs = 24 * 60 * 60 * 1000;
  const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs));
  const postsByDay: PostsByDayDatum[] = [];
  for (let i = 0; i < periodDays; i++) {
    const dayStart = new Date(start.getTime() + i * dayMs);
    const dayEnd = new Date(dayStart.getTime() + dayMs);
    const dayPosts = posts.filter((p) => p.postedAt >= dayStart && p.postedAt < dayEnd);
    postsByDay.push({
      dayIndex: i + 1,
      date: dayStart.toISOString().slice(0, 10),
      count: dayPosts.length,
      highlightedCount: dayPosts.filter((p) => p.isHighlighted).length,
    });
  }

  return {
    totalCount: posts.length,
    violentCount,
    nonViolentCount,
    unclassifiedCount,
    highlightedCount,
    autoCount,
    manualCount,
    topicCounts,
    postsByDay,
  };
}

export async function getSocialMonitorPeriodComparison(
  selected: { start: Date; end: Date },
  compared: { start: Date; end: Date }
): Promise<PeriodComparison> {
  const [selectedMetrics, comparedMetrics] = await Promise.all([
    computePeriodMetrics(selected.start, selected.end),
    computePeriodMetrics(compared.start, compared.end),
  ]);
  return { selected: selectedMetrics, compared: comparedMetrics };
}

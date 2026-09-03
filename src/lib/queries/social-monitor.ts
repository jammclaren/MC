import { prisma } from "@/lib/prisma";

export interface SocialMonitorData {
  posts: {
    id: string;
    pageName: string;
    authorName: string | null;
    content: string;
    postUrl: string | null;
    postedAt: Date;
    classification: string | null;
    isHighlighted: boolean;
    sourceNote: string | null;
    externalPostId: string | null;
  }[];
  totalCount: number;
  violentCount: number;
  nonViolentCount: number;
  highlightedCount: number;
  lastSyncedAt: Date | null;
}

export async function getSocialMonitorData(): Promise<SocialMonitorData> {
  const [posts, violentCount, nonViolentCount, highlightedCount, lastSynced] = await Promise.all([
    prisma.socialMediaPost.findMany({
      orderBy: { postedAt: "desc" },
      take: 200,
    }),
    prisma.socialMediaPost.count({ where: { classification: "VIOLENT" } }),
    prisma.socialMediaPost.count({ where: { classification: "NON_VIOLENT" } }),
    prisma.socialMediaPost.count({ where: { isHighlighted: true } }),
    // Most recent auto-fetched post's createdAt stands in for "last synced"
    // — manual entries (externalPostId null) don't count as a sync run.
    prisma.socialMediaPost.findFirst({
      where: { externalPostId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const totalCount = await prisma.socialMediaPost.count();

  return {
    posts,
    totalCount,
    violentCount,
    nonViolentCount,
    highlightedCount,
    lastSyncedAt: lastSynced?.createdAt ?? null,
  };
}

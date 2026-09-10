import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canAccessSocialMonitor } from "@/lib/rbac";
import { classifyPostContent, classifyPostTopic } from "@/lib/social-classifier";

// How far back to look on every run — generous overlap with the hourly
// cadence so a slow run or a missed tick doesn't drop posts; upserts on
// (platform, externalPostId) make re-fetching the same post a no-op.
const LOOKBACK_HOURS = 6;

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  from?: { name?: string };
}

interface SyncPageResult {
  pageId: string;
  pageName: string;
  fetched: number;
  created: number;
  error?: string;
}

/**
 * Requests must come from either Vercel Cron (a shared-secret bearer
 * token, since the cron trigger carries no browser session) or a signed-in
 * user who already has Social Media Monitor access — never anonymously.
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }
  const user = await getSessionUser();
  return !!user && canAccessSocialMonitor(user);
}

async function fetchPageBatch(
  pageId: string,
  accessToken: string,
  sinceIso: string
): Promise<{ pageName: string; posts: FacebookPost[] }> {
  const url = new URL(`https://graph.facebook.com/v19.0/${pageId}/posts`);
  url.searchParams.set("fields", "id,message,created_time,permalink_url,from");
  url.searchParams.set("since", sinceIso);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Facebook API error (${res.status})`);
  }
  return {
    pageName: data?.data?.[0]?.from?.name ?? pageId,
    posts: (data?.data ?? []) as FacebookPost[],
  };
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageIdsRaw = process.env.FACEBOOK_MONITORED_PAGE_IDS;

  if (!accessToken || !pageIdsRaw) {
    return NextResponse.json({
      configured: false,
      message:
        "Facebook sync is not configured yet — set FACEBOOK_PAGE_ACCESS_TOKEN and " +
        "FACEBOOK_MONITORED_PAGE_IDS to enable automatic hourly monitoring. " +
        "Posts can still be logged manually in the meantime.",
    });
  }

  const pageIds = pageIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const sinceIso = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const results: SyncPageResult[] = [];

  for (const pageId of pageIds) {
    const result: SyncPageResult = { pageId, pageName: pageId, fetched: 0, created: 0 };
    try {
      const { pageName, posts } = await fetchPageBatch(pageId, accessToken, sinceIso);
      result.pageName = pageName;
      result.fetched = posts.length;

      for (const post of posts) {
        if (!post.message) continue; // skip photo-only/no-text posts — nothing to classify

        const existing = await prisma.socialMediaPost.findUnique({
          where: { platform_externalPostId: { platform: "FACEBOOK", externalPostId: post.id } },
        });
        if (existing) continue;

        const classification = classifyPostContent(post.message);
        const topic = classifyPostTopic(post.message);
        await prisma.socialMediaPost.create({
          data: {
            platform: "FACEBOOK",
            externalPostId: post.id,
            pageName,
            authorName: post.from?.name ?? null,
            content: post.message,
            postUrl: post.permalink_url ?? null,
            postedAt: new Date(post.created_time),
            classification,
            topic,
            isHighlighted: classification === "VIOLENT",
          },
        });
        result.created += 1;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";
    }
    results.push(result);
  }

  return NextResponse.json({
    configured: true,
    syncedAt: new Date().toISOString(),
    pages: results,
  });
}

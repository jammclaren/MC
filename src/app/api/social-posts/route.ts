import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanAccessSocialMonitor } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { classifyPostContent, classifyPostTopic, TOPIC_OPTIONS } from "@/lib/social-classifier";
import type { SocialPostTopic } from "@/generated/prisma/client";

const TOPIC_VALUES = TOPIC_OPTIONS.map((o) => o.value) as [SocialPostTopic, ...SocialPostTopic[]];

const createPostSchema = z.object({
  pageName: z.string().trim().min(1).max(200),
  authorName: z.string().trim().max(200).nullable().optional(),
  content: z.string().trim().min(1).max(4000),
  postUrl: z.string().trim().url().max(500).nullable().optional(),
  postedAt: z.coerce.date(),
  classification: z.enum(["VIOLENT", "NON_VIOLENT"]).nullable().optional(),
  topic: z.enum(TOPIC_VALUES).nullable().optional(),
  isHighlighted: z.boolean().optional(),
  sourceNote: z.string().trim().max(300).nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);

    const posts = await prisma.socialMediaPost.findMany({
      orderBy: { postedAt: "desc" },
      take: 200,
    });
    return NextResponse.json(posts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);
    const body = createPostSchema.parse(await request.json());

    const post = await withAudit(
      (tx) =>
        tx.socialMediaPost.create({
          data: {
            pageName: body.pageName,
            authorName: body.authorName ?? null,
            content: body.content,
            postUrl: body.postUrl ?? null,
            postedAt: body.postedAt,
            classification: body.classification ?? classifyPostContent(body.content),
            topic: body.topic ?? classifyPostTopic(body.content),
            isHighlighted: body.isHighlighted ?? false,
            sourceNote: body.sourceNote ?? null,
            createdById: user.id,
          },
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "SocialMediaPost",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

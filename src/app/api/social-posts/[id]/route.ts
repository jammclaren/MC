import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanAccessSocialMonitor } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { TOPIC_OPTIONS } from "@/lib/social-classifier";
import type { SocialPostTopic } from "@/generated/prisma/client";

const TOPIC_VALUES = TOPIC_OPTIONS.map((o) => o.value) as [SocialPostTopic, ...SocialPostTopic[]];

const updatePostSchema = z.object({
  pageName: z.string().trim().min(1).max(200).optional(),
  authorName: z.string().trim().max(200).nullable().optional(),
  content: z.string().trim().min(1).max(4000).optional(),
  postUrl: z.string().trim().url().max(500).nullable().optional(),
  postedAt: z.coerce.date().optional(),
  classification: z.enum(["VIOLENT", "NON_VIOLENT"]).nullable().optional(),
  topic: z.enum(TOPIC_VALUES).nullable().optional(),
  isHighlighted: z.boolean().optional(),
  sourceNote: z.string().trim().max(300).nullable().optional(),
});

async function loadPostOrThrow(id: string) {
  const post = await prisma.socialMediaPost.findUnique({ where: { id } });
  if (!post) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return post;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);
    const existing = await loadPostOrThrow(id);

    const body = updatePostSchema.parse(await request.json());

    const updated = await withAudit(
      (tx) => tx.socialMediaPost.update({ where: { id }, data: body }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "SocialMediaPost",
        entityId: id,
        diff: { before: existing, changes: body },
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);
    const existing = await loadPostOrThrow(id);

    await withAudit(
      (tx) => tx.socialMediaPost.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "SocialMediaPost",
        entityId: id,
        diff: { before: existing },
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

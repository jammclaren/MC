import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanAccessSocialMonitor } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const issueSchema = z.object({
  label: z.string().trim().min(1).max(200),
  mentions: z.coerce.number().int().min(0),
  engagementLabel: z.string().trim().min(1).max(50),
  reachLabel: z.string().trim().min(1).max(50),
  authors: z.coerce.number().int().min(0),
  status: z.string().trim().min(1).max(100),
  riskLevel: z.string().trim().min(1).max(100),
});

const platformSchema = z.object({
  platform: z.string().trim().min(1).max(100),
  mentions: z.coerce.number().int().min(0),
});

const activitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().min(1).max(300),
  sourceUrl: z.string().trim().url().max(500).nullable().optional(),
  analysis: z.string().trim().min(1).max(4000),
  assessment: z.string().trim().min(1).max(4000),
});

const updateReportSchema = z.object({
  periodLabel: z.string().trim().min(1).max(200),
  uniqueSources: z.coerce.number().int().min(0),
  engagementLabel: z.string().trim().min(1).max(50),
  overallRiskLevel: z.string().trim().min(1).max(100),
  riskRationale: z.string().trim().min(1).max(2000),
  dominantNarratives: z.array(z.string().trim().min(1)).max(20),
  emergingNarratives: z.array(z.string().trim().min(1)).max(20),
  indicatorsToWatch: z.array(z.string().trim().min(1)).max(20),
  issues: z.array(issueSchema).max(30),
  platformMentions: z.array(platformSchema).max(20),
  significantActivities: z.array(activitySchema).max(30),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);
    const { id } = await params;
    const body = updateReportSchema.parse(await request.json());

    // A report is always transcribed and edited as one whole unit, so the
    // child rows are replaced wholesale rather than diffed.
    const report = await withAudit(
      async (tx) => {
        await tx.socialListeningIssue.deleteMany({ where: { reportId: id } });
        await tx.socialListeningPlatformMention.deleteMany({ where: { reportId: id } });
        await tx.socialListeningActivity.deleteMany({ where: { reportId: id } });
        return tx.socialListeningReport.update({
          where: { id },
          data: {
            periodLabel: body.periodLabel,
            uniqueSources: body.uniqueSources,
            engagementLabel: body.engagementLabel,
            overallRiskLevel: body.overallRiskLevel,
            riskRationale: body.riskRationale,
            dominantNarratives: body.dominantNarratives,
            emergingNarratives: body.emergingNarratives,
            indicatorsToWatch: body.indicatorsToWatch,
            issues: {
              create: body.issues.map((issue, i) => ({ ...issue, sortOrder: i })),
            },
            platformMentions: {
              create: body.platformMentions.map((p, i) => ({ ...p, sortOrder: i })),
            },
            significantActivities: {
              create: body.significantActivities.map((a, i) => ({
                ...a,
                sourceUrl: a.sourceUrl ?? null,
                rank: i,
              })),
            },
          },
          include: { issues: true, platformMentions: true, significantActivities: true },
        });
      },
      {
        userId: user.id,
        action: "UPDATE",
        entity: "SocialListeningReport",
        entityId: id,
        diff: body,
      }
    );

    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);
    const { id } = await params;

    await withAudit(
      (tx) => tx.socialListeningReport.delete({ where: { id } }),
      {
        userId: user.id,
        action: "DELETE",
        entity: "SocialListeningReport",
        entityId: id,
      }
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

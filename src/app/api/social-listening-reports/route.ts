import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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

const createReportSchema = z.object({
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

export async function GET() {
  try {
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);

    const reports = await prisma.socialListeningReport.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, periodLabel: true, createdAt: true },
    });
    return NextResponse.json(reports);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);
    const body = createReportSchema.parse(await request.json());

    const report = await withAudit(
      (tx) =>
        tx.socialListeningReport.create({
          data: {
            periodLabel: body.periodLabel,
            uniqueSources: body.uniqueSources,
            engagementLabel: body.engagementLabel,
            overallRiskLevel: body.overallRiskLevel,
            riskRationale: body.riskRationale,
            dominantNarratives: body.dominantNarratives,
            emergingNarratives: body.emergingNarratives,
            indicatorsToWatch: body.indicatorsToWatch,
            createdById: user.id,
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
        }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "SocialListeningReport",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

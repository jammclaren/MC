import { prisma } from "@/lib/prisma";

export interface SocialListeningIssueRow {
  id: string;
  label: string;
  mentions: number;
  engagementLabel: string;
  reachLabel: string;
  authors: number;
  status: string;
  riskLevel: string;
}

export interface SocialListeningPlatformRow {
  id: string;
  platform: string;
  mentions: number;
}

export interface SocialListeningActivityRow {
  id: string;
  rank: number;
  title: string;
  subtitle: string;
  sourceUrl: string | null;
  analysis: string;
  assessment: string;
}

export interface SocialListeningReportDetail {
  id: string;
  periodLabel: string;
  uniqueSources: number;
  engagementLabel: string;
  overallRiskLevel: string;
  riskRationale: string;
  dominantNarratives: string[];
  emergingNarratives: string[];
  indicatorsToWatch: string[];
  createdAt: Date;
  issues: SocialListeningIssueRow[];
  platformMentions: SocialListeningPlatformRow[];
  significantActivities: SocialListeningActivityRow[];
}

export interface SocialListeningReportOption {
  id: string;
  periodLabel: string;
  createdAt: Date;
}

/** Most recent report by default, or a specific one via `reportId` — the
 * page's report-history selector reuses the same GET-param convention as
 * the Selected/Compared Period date pickers. */
export async function getSocialListeningReport(
  reportId?: string
): Promise<SocialListeningReportDetail | null> {
  const report = await prisma.socialListeningReport.findFirst({
    where: reportId ? { id: reportId } : undefined,
    orderBy: reportId ? undefined : { createdAt: "desc" },
    include: {
      issues: { orderBy: { sortOrder: "asc" } },
      platformMentions: { orderBy: { sortOrder: "asc" } },
      significantActivities: { orderBy: { rank: "asc" } },
    },
  });
  return report;
}

export async function listSocialListeningReportOptions(): Promise<SocialListeningReportOption[]> {
  return prisma.socialListeningReport.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, periodLabel: true, createdAt: true },
  });
}

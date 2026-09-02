import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";
import { getOverviewData } from "@/lib/queries/overview";
import { computeDailyAssessment } from "@/lib/queries/daily-assessment";
import { listRecentJtfAssessmentsForDailyAnalysis } from "@/lib/queries/jtf-assessments";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const [overview, jtfAssessments] = await Promise.all([
      getOverviewData(user),
      listRecentJtfAssessmentsForDailyAnalysis(),
    ]);
    const assessment = computeDailyAssessment(overview, jtfAssessments);
    return NextResponse.json(assessment);
  } catch (error) {
    return handleApiError(error);
  }
}

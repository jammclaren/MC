import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";
import { getOverviewData } from "@/lib/queries/overview";
import { computeDailyAssessment } from "@/lib/queries/daily-assessment";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const overview = await getOverviewData(user);
    const assessment = computeDailyAssessment(overview);
    return NextResponse.json(assessment);
  } catch (error) {
    return handleApiError(error);
  }
}

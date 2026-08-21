import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";
import { getScoredAreas } from "@/lib/queries/priority-areas";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const scored = await getScoredAreas(user);

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 100) : 10;

    return NextResponse.json(scored.slice(0, limit));
  } catch (error) {
    return handleApiError(error);
  }
}

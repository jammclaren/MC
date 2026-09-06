import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanAccessSituationReport } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { generateSitrepDraft } from "@/lib/queries/situation-report";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Returns a fresh draft without saving it — the caller decides whether to
 * accept it (overwriting whatever is in the editor) and then save. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanAccessSituationReport(user);
    const { date } = bodySchema.parse(await request.json());
    const content = await generateSitrepDraft(user, date);
    return NextResponse.json({ content });
  } catch (error) {
    return handleApiError(error);
  }
}

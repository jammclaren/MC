import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const createPartySchema = z.object({
  abbreviation: z.string().min(1),
  name: z.string().min(1),
});

export async function GET() {
  try {
    await requireSessionUser();
    const parties = await prisma.party.findMany({ orderBy: { abbreviation: "asc" } });
    return NextResponse.json(parties);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN", "JTF_COMMANDER", "JTF_STAFF"]);
    const body = createPartySchema.parse(await request.json());

    const party = await withAudit(
      (tx) => tx.party.create({ data: body }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "Party",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

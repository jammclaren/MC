import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

// Directly-entered party-list vote totals aren't owned by any JTF the way
// a Candidate row is, so the caller passes the JTF that owns the province
// (same PROVINCE_TO_JTF mapping the Election Profile page already uses)
// purely to authorize the write.
const upsertPartyResultSchema = z.object({
  jtfId: z.string().min(1),
  partyId: z.string().min(1),
  province: z.string().min(1),
  votesEncoded: z.number().int().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = upsertPartyResultSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    const result = await withAudit(
      (tx) =>
        tx.partyProvinceResult.upsert({
          where: { partyId_province: { partyId: body.partyId, province: body.province } },
          create: {
            partyId: body.partyId,
            province: body.province,
            votesEncoded: body.votesEncoded,
          },
          update: { votesEncoded: body.votesEncoded },
        }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "PartyProvinceResult",
        entityId: (r) => r.id,
        diff: body,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

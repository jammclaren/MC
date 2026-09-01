import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteJtf } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const upsertVotersSchema = z.object({
  jtfId: z.string().min(1),
  province: z.string().min(1),
  municipality: z.string().optional(),
  barangay: z.string().optional(),
  registeredVoters: z.number().int().nonnegative(),
});

function conflict(message: string): never {
  const error = new Error(message);
  (error as { status?: number }).status = 409;
  throw error;
}

/**
 * Idempotent registered-voters entry point, keyed on (jtfId, province,
 * municipality, barangay): updates the matching ElectionArea's
 * registeredVoters if one already exists instead of always creating a new
 * row. The dialog this backs replaces a since-removed "Add Registered
 * Voters" button that always created — re-entering (or re-submitting with
 * a typo'd municipality spelling) a figure through it silently
 * double-counted that municipality in every province/BARMM-wide sum.
 *
 * A blank barangay means "this municipality's total" — that's only safe to
 * create fresh when the municipality has no real per-barangay voter data
 * of its own yet; otherwise it would double what the barangay breakdown
 * already contributes. Existing per-barangay data should be corrected via
 * the full Edit Election Area form instead.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = upsertVotersSchema.parse(await request.json());
    assertCanWriteJtf(user, body.jtfId);

    const municipality = body.municipality?.trim() || null;
    const barangay = body.barangay?.trim() || null;

    const existing = await prisma.electionArea.findFirst({
      where: { jtfId: body.jtfId, province: body.province, municipality, barangay },
    });

    if (!existing && barangay === null) {
      const barangayRows = await prisma.electionArea.findMany({
        where: {
          jtfId: body.jtfId,
          province: body.province,
          municipality,
          barangay: { not: null },
        },
        select: { registeredVoters: true },
      });
      const hasRealVoterData = barangayRows.some((r) => (r.registeredVoters ?? 0) > 0);
      if (hasRealVoterData) {
        conflict(
          "This municipality already has barangay-level voter data on file — edit the individual barangay entries instead of adding a municipality-level total."
        );
      }
    }

    const area = existing
      ? await withAudit(
          (tx) =>
            tx.electionArea.update({
              where: { id: existing.id },
              data: { registeredVoters: body.registeredVoters },
            }),
          {
            userId: user.id,
            action: "UPDATE",
            entity: "ElectionArea",
            entityId: existing.id,
            diff: {
              before: { registeredVoters: existing.registeredVoters },
              changes: { registeredVoters: body.registeredVoters },
            },
          }
        )
      : await withAudit(
          (tx) =>
            tx.electionArea.create({
              data: {
                jtfId: body.jtfId,
                province: body.province,
                municipality,
                barangay,
                registeredVoters: body.registeredVoters,
              },
            }),
          {
            userId: user.id,
            action: "CREATE",
            entity: "ElectionArea",
            entityId: (result) => result.id,
            diff: {
              jtfId: body.jtfId,
              province: body.province,
              municipality,
              barangay,
              registeredVoters: body.registeredVoters,
            },
          }
        );

    return NextResponse.json(area, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteCmoActivity } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { parseMgrs } from "@/lib/mgrs";

const updateCmoActivitySchema = z.object({
  category: z.enum(["PUBLIC_AFFAIRS", "CIVIL_AFFAIRS", "PSYOPS", "IEC"]).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  narrative: z.string().trim().min(1).max(4000).optional(),
  locationLabel: z.string().trim().min(1).max(200).optional(),
  mgrs: z.string().trim().min(1).optional(),
  date: z.coerce.date().optional(),
});

async function loadCmoActivityOrThrow(id: string) {
  const row = await prisma.cmoActivity.findUnique({ where: { id } });
  if (!row) {
    const error = new Error("Not found");
    (error as { status?: number }).status = 404;
    throw error;
  }
  return row;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    assertCanWriteCmoActivity(user);
    const existing = await loadCmoActivityOrThrow(id);

    const body = updateCmoActivitySchema.parse(await request.json());
    const { mgrs, ...rest } = body;

    let latLng: { lat: number; lng: number } | undefined;
    if (mgrs) {
      const parsed = parseMgrs(mgrs);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      latLng = parsed;
    }

    const updated = await withAudit(
      (tx) => tx.cmoActivity.update({ where: { id }, data: { ...rest, ...latLng } }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "CmoActivity",
        entityId: id,
        diff: { before: existing, changes: body },
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    assertCanWriteCmoActivity(user);
    const existing = await loadCmoActivityOrThrow(id);

    await withAudit((tx) => tx.cmoActivity.delete({ where: { id } }), {
      userId: user.id,
      action: "DELETE",
      entity: "CmoActivity",
      entityId: id,
      diff: { before: existing },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

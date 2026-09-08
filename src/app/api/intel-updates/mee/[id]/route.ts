import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { assertCanWriteIntelligenceUpdate } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";
import { parseMgrs } from "@/lib/mgrs";

const updateSchema = z.object({
  jtfId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  assetType: z.string().trim().min(1).max(120).optional(),
  quantity: z.number().int().nonnegative().optional(),
  mgrs: z.string().trim().min(1).optional(),
});

async function loadOrThrow(id: string) {
  const row = await prisma.intelMeeAsset.findUnique({ where: { id } });
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
    assertCanWriteIntelligenceUpdate(user);
    const existing = await loadOrThrow(id);

    const body = updateSchema.parse(await request.json());
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
      (tx) => tx.intelMeeAsset.update({ where: { id }, data: { ...rest, ...latLng } }),
      {
        userId: user.id,
        action: "UPDATE",
        entity: "IntelMeeAsset",
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
    assertCanWriteIntelligenceUpdate(user);
    const existing = await loadOrThrow(id);

    await withAudit((tx) => tx.intelMeeAsset.delete({ where: { id } }), {
      userId: user.id,
      action: "DELETE",
      entity: "IntelMeeAsset",
      entityId: id,
      diff: { before: existing },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

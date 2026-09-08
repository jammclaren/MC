import { prisma } from "@/lib/prisma";
import { assertCanAccessIntelligenceUpdate, type SessionUser } from "@/lib/rbac";

export interface IntelMeeAssetRow {
  id: string;
  jtfId: string;
  jtfName: string;
  name: string;
  assetType: string;
  quantity: number;
  createdAt: string;
}

export async function listIntelMeeAssets(user: SessionUser): Promise<IntelMeeAssetRow[]> {
  assertCanAccessIntelligenceUpdate(user);
  const rows = await prisma.intelMeeAsset.findMany({
    include: { jtf: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    jtfId: r.jtfId,
    jtfName: r.jtf.name,
    name: r.name,
    assetType: r.assetType,
    quantity: r.quantity,
    createdAt: r.createdAt.toISOString(),
  }));
}

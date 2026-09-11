import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    requireRole(user, ["ADMIN"]);

    const { searchParams } = request.nextUrl;
    const entity = searchParams.get("entity");
    const userId = searchParams.get("userId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 500) : 100;

    const logs = await prisma.auditLog.findMany({
      where: {
        entity: entity ?? undefined,
        userId: userId ?? undefined,
        createdAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(logs);
  } catch (error) {
    return handleApiError(error);
  }
}

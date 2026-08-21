import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    await requireSessionUser();
    const jtfs = await prisma.jTF.findMany({
      select: { id: true, name: true, areaOfOps: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(jtfs);
  } catch (error) {
    return handleApiError(error);
  }
}

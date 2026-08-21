import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { withAudit } from "@/lib/audit";

const categorySchema = z.enum(["CTG", "LTG", "CBC"]);

const createHviSchema = z.object({
  category: categorySchema,
  name: z.string().min(1),
  role: z.string().optional(),
  outcome: z.string().min(1),
  date: z.coerce.date(),
  location: z.string().optional(),
  narrative: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser();
    const category = request.nextUrl.searchParams.get("category");
    const parsedCategory = category ? categorySchema.parse(category) : undefined;

    const entries = await prisma.hviLogEntry.findMany({
      where: parsedCategory ? { category: parsedCategory } : undefined,
      orderBy: { date: "desc" },
    });
    return NextResponse.json(entries);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    // HviLogEntry has no per-JTF ownership field in the schema, so writes are
    // limited to the roles that aren't purely read-only (VIEWER, COMMAND).
    requireRole(user, ["ADMIN", "JTF_COMMANDER", "JTF_STAFF"]);
    const body = createHviSchema.parse(await request.json());

    const entry = await withAudit(
      (tx) => tx.hviLogEntry.create({ data: body }),
      {
        userId: user.id,
        action: "CREATE",
        entity: "HviLogEntry",
        entityId: (result) => result.id,
        diff: body,
      }
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

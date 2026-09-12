import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { error: "A record with these unique values already exists" },
      { status: 409 }
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return NextResponse.json(
      { error: "This record is still referenced by other data and can't be deleted" },
      { status: 409 }
    );
  }
  if (
    error instanceof Error &&
    typeof (error as unknown as { status?: unknown }).status === "number"
  ) {
    const status = (error as unknown as { status: number }).status;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

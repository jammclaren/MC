import type { Role, WarfightingFunction } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  jtfId: string | null;
  warfightingFunction: WarfightingFunction | null;
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * A user with no JTF scope (jtfId === null — always true for ADMIN/COMMAND,
 * and optionally true for a "command-wide" VIEWER set up that way at account
 * creation, per SPEC.md §6) reads everything. A JTF-scoped user reads their
 * own JTF's records plus command-wide records (targetJtfId === null).
 */
export function canReadJtf(user: SessionUser, targetJtfId: string | null): boolean {
  if (user.jtfId === null) return true;
  if (targetJtfId === null) return true;
  return user.jtfId === targetJtfId;
}

/** Only ADMIN, and JTF_COMMANDER/JTF_STAFF within their own JTF, may write. */
export function canWriteJtf(user: SessionUser, targetJtfId: string): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "JTF_COMMANDER" || user.role === "JTF_STAFF") {
    return user.jtfId === targetJtfId;
  }
  return false;
}

/** JTF_STAFF may only edit/delete entries they created themselves. */
export function canModifyEntry(
  user: SessionUser,
  targetJtfId: string,
  createdById: string
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "JTF_COMMANDER") return user.jtfId === targetJtfId;
  if (user.role === "JTF_STAFF") {
    return user.jtfId === targetJtfId && user.id === createdById;
  }
  return false;
}

export function requireRole(user: SessionUser, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(`Requires one of roles: ${roles.join(", ")}`);
  }
}

export function assertCanReadJtf(user: SessionUser, targetJtfId: string | null): void {
  if (!canReadJtf(user, targetJtfId)) {
    throw new ForbiddenError("Not authorized to read data for this JTF");
  }
}

export function assertCanWriteJtf(user: SessionUser, targetJtfId: string): void {
  if (!canWriteJtf(user, targetJtfId)) {
    throw new ForbiddenError("Not authorized to write data for this JTF");
  }
}

export function assertCanModifyEntry(
  user: SessionUser,
  targetJtfId: string,
  createdById: string
): void {
  if (!canModifyEntry(user, targetJtfId, createdById)) {
    throw new ForbiddenError("Not authorized to modify this entry");
  }
}

/**
 * JTF_COMMANDER's read scope is "own JTF full detail, other JTFs
 * rollup-only" (SPEC.md §6) — a JTF_COMMANDER may see aggregate/summary
 * data across every JTF, but not other JTFs' row-level detail (individual
 * incidents, named HVI entries, etc). Callers decide per query whether what
 * they're returning is aggregate-only (pass allowRollup: true to
 * scopeJtfFilter) or row-level detail (leave it strict).
 */
export function canReadRollup(user: SessionUser): boolean {
  return user.jtfId === null || user.role === "JTF_COMMANDER";
}

/**
 * Prisma `where.jtfId` value implementing a GET route's read scope, given an
 * optional explicit `?jtfId=` query param (caller must have already checked
 * that param with assertCanReadJtf) and whether this particular query is
 * aggregate-only (see canReadRollup above). `undefined` means "no filter" —
 * Prisma omits undefined where-keys, so this naturally means "read
 * everything" for an unscoped (or rollup-eligible, on an aggregate query)
 * user. Never returns `null`, which would instead filter for rows where
 * jtfId IS NULL.
 */
export function scopeJtfFilter(
  user: SessionUser,
  explicitJtfId?: string | null,
  options?: { allowRollup?: boolean }
): string | undefined {
  if (explicitJtfId) return explicitJtfId;
  if (options?.allowRollup && canReadRollup(user)) return undefined;
  return user.jtfId ?? undefined;
}

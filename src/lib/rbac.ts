import type { Role } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  jtfId: string | null;
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Command-wide records (targetJtfId === null, e.g. CTG rollups not tied to a
 * single JTF) are readable by any authenticated role. JTF-scoped records are
 * readable by ADMIN/COMMAND always, and by other roles only within their own
 * jtfId — matches the read-scope column of the RBAC table in SPEC.md §6.
 */
export function canReadJtf(user: SessionUser, targetJtfId: string | null): boolean {
  if (user.role === "ADMIN" || user.role === "COMMAND") return true;
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

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

/** Only ADMIN, and JTF_COMMANDER/JTF_STAFF/BATTALION_STAFF within their own
 * JTF, may write. BATTALION_STAFF is scoped identically to JTF_STAFF — the
 * difference between them is which pages/nav links are visible at all (see
 * canAccessPage), not what a write within an allowed page may touch. */
export function canWriteJtf(user: SessionUser, targetJtfId: string): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "JTF_COMMANDER" || user.role === "JTF_STAFF" || user.role === "BATTALION_STAFF") {
    return user.jtfId === targetJtfId;
  }
  return false;
}

/** JTF_STAFF/BATTALION_STAFF may only edit/delete entries they created
 * themselves. */
export function canModifyEntry(
  user: SessionUser,
  targetJtfId: string,
  createdById: string
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "JTF_COMMANDER") return user.jtfId === targetJtfId;
  if (user.role === "JTF_STAFF" || user.role === "BATTALION_STAFF") {
    return user.jtfId === targetJtfId && user.id === createdById;
  }
  return false;
}

/**
 * BATTALION_STAFF has the narrowest nav/page surface of any JTF-scoped
 * role: Overview, Monitored Incidents, Election Status, and Election
 * Profile only — no Situation Map, no Deployment. Every other role keeps
 * its existing full access to these four pages; this only ever removes
 * access, never grants it beyond what a role already had.
 */
const BATTALION_STAFF_BLOCKED_PAGES = ["situation-map", "deployment"] as const;
type RestrictablePage = (typeof BATTALION_STAFF_BLOCKED_PAGES)[number];

export function canAccessPage(user: SessionUser, page: RestrictablePage): boolean {
  if (user.role === "BATTALION_STAFF") {
    return !BATTALION_STAFF_BLOCKED_PAGES.includes(page);
  }
  return true;
}

export function assertCanAccessPage(user: SessionUser, page: RestrictablePage): void {
  if (!canAccessPage(user, page)) {
    throw new ForbiddenError("Not authorized to access this page");
  }
}

// Launched. Automatic Facebook sync still needs FACEBOOK_PAGE_ACCESS_TOKEN
// and FACEBOOK_MONITORED_PAGE_IDS set before the hourly cron does anything
// (see api/social-posts/sync) — manual logging works regardless.
const SOCIAL_MONITOR_LAUNCHED = true;

/**
 * Social Media Monitor is restricted beyond the usual JTF/command scoping:
 * COMMAND and ADMIN command-wide, plus WFC_STAFF in CMO (civil-military/
 * public-sentiment) specifically — explicitly NOT Intelligence (M2), or any
 * other warfighting function. Every other role, including JTF_COMMANDER/
 * JTF_STAFF, has no access at all — this isn't a JTF-scoped feature.
 */
export function canAccessSocialMonitor(user: SessionUser): boolean {
  if (!SOCIAL_MONITOR_LAUNCHED) return false;
  if (user.role === "ADMIN" || user.role === "COMMAND") return true;
  if (user.role === "WFC_STAFF") {
    return user.warfightingFunction === "CMO";
  }
  return false;
}

export function assertCanAccessSocialMonitor(user: SessionUser): void {
  if (!canAccessSocialMonitor(user)) {
    throw new ForbiddenError("Not authorized to access the Social Media Monitor");
  }
}

/**
 * Situation Report is restricted to ADMIN and WFC Intelligence (M2) only —
 * explicitly not COMMAND, not CMO, and not any JTF-scoped role.
 */
export function canAccessSituationReport(user: SessionUser): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "WFC_STAFF") {
    return user.warfightingFunction === "INTELLIGENCE";
  }
  return false;
}

export function assertCanAccessSituationReport(user: SessionUser): void {
  if (!canAccessSituationReport(user)) {
    throw new ForbiddenError("Not authorized to access the Situation Report");
  }
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

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

/** Only ADMIN, and JTF_COMMANDER/JTF_STAFF/BRIGADE_STAFF within their own
 * JTF, may write. BRIGADE_STAFF is scoped identically to JTF_STAFF — the
 * difference between them is which pages/nav links are visible at all (see
 * canAccessPage), not what a write within an allowed page may touch. */
export function canWriteJtf(user: SessionUser, targetJtfId: string): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "JTF_COMMANDER" || user.role === "JTF_STAFF" || user.role === "BRIGADE_STAFF") {
    return user.jtfId === targetJtfId;
  }
  return false;
}

/**
 * Deployment is also owned by WFC Maneuver ("M2") command-wide — unlike
 * JTF_COMMANDER/JTF_STAFF, a WFC_STAFF account isn't tied to one JTF, so
 * ownership here means the same "any JTF" write access ADMIN already has
 * on this one page. CMO and Intelligence get read-only cross-visibility
 * (see the bpe-deployment page itself) but not this. Kept separate from
 * canWriteJtf/assertCanWriteJtf
 * so this grant never leaks into RIDO/HVI Log/Incidents/Election Areas etc.,
 * which stay JTF-scoped-roles-only.
 */
export function canWriteDeployment(user: SessionUser, targetJtfId: string): boolean {
  if (user.role === "WFC_STAFF" && user.warfightingFunction === "MANEUVER") return true;
  return canWriteJtf(user, targetJtfId);
}

export function assertCanWriteDeployment(user: SessionUser, targetJtfId: string): void {
  if (!canWriteDeployment(user, targetJtfId)) {
    throw new ForbiddenError("Not authorized to write deployment data for this JTF");
  }
}

/**
 * Monitored Incidents is also owned by WFC Maneuver ("M2") command-wide,
 * the same grant already given on Deployment (see canWriteDeployment) —
 * logging and editing incidents is part of M2's maneuver picture, not
 * just troop counts. Kept as its own function (rather than folding into
 * canWriteJtf) so this stays opt-in per page, same discipline as
 * canWriteDeployment.
 */
export function canWriteIncident(user: SessionUser, targetJtfId: string): boolean {
  if (user.role === "WFC_STAFF" && user.warfightingFunction === "MANEUVER") return true;
  return canWriteJtf(user, targetJtfId);
}

export function assertCanWriteIncident(user: SessionUser, targetJtfId: string): void {
  if (!canWriteIncident(user, targetJtfId)) {
    throw new ForbiddenError("Not authorized to write incident data for this JTF");
  }
}

/**
 * M2's incident edit/delete access is command-wide like its create access
 * above — not limited to entries M2 itself created, the same "any JTF"
 * posture canWriteDeployment already gives it on Deployment rows (which
 * likewise isn't gated on createdById). JTF_STAFF/BRIGADE_STAFF keep the
 * existing "own entries only" restriction from canModifyEntry.
 */
export function canModifyIncident(
  user: SessionUser,
  targetJtfId: string,
  createdById: string
): boolean {
  if (user.role === "WFC_STAFF" && user.warfightingFunction === "MANEUVER") return true;
  return canModifyEntry(user, targetJtfId, createdById);
}

export function assertCanModifyIncident(
  user: SessionUser,
  targetJtfId: string,
  createdById: string
): void {
  if (!canModifyIncident(user, targetJtfId, createdById)) {
    throw new ForbiddenError("Not authorized to modify this incident");
  }
}

/** JTF_STAFF/BRIGADE_STAFF may only edit/delete entries they created
 * themselves. */
export function canModifyEntry(
  user: SessionUser,
  targetJtfId: string,
  createdById: string
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "JTF_COMMANDER") return user.jtfId === targetJtfId;
  if (user.role === "JTF_STAFF" || user.role === "BRIGADE_STAFF") {
    return user.jtfId === targetJtfId && user.id === createdById;
  }
  return false;
}

/**
 * BRIGADE_STAFF has the narrowest nav/page surface of any JTF-scoped
 * role: Overview and Monitored Incidents only — no Situation Map, no
 * Deployment. Every other role keeps its existing full access to these
 * pages; this only ever removes access, never grants it beyond what a
 * role already had.
 */
const BRIGADE_STAFF_BLOCKED_PAGES = ["situation-map", "deployment"] as const;

type RestrictablePage = (typeof BRIGADE_STAFF_BLOCKED_PAGES)[number];

export function canAccessPage(user: SessionUser, page: RestrictablePage): boolean {
  if (user.role === "BRIGADE_STAFF") {
    return !(BRIGADE_STAFF_BLOCKED_PAGES as readonly string[]).includes(page);
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
 * COMMAND and ADMIN command-wide, a command-wide VIEWER (jtfId === null —
 * see canReadJtf's doc comment; a JTF-scoped VIEWER doesn't get this, since
 * the feature itself isn't JTF-scoped), plus every WFC_STAFF function (CMO,
 * which owns and can write it; INTELLIGENCE and MANEUVER get read-only
 * visibility into it, see canWriteSocialMonitor below). Every other role,
 * including JTF_COMMANDER/JTF_STAFF, has no access at all. COMMAND and a
 * command-wide VIEWER are pure viewers (see canWriteSocialMonitor,
 * canWriteIntelligenceUpdate, canWriteDeployment) — neither ever gets
 * write access to anything.
 */
export function canAccessSocialMonitor(user: SessionUser): boolean {
  if (!SOCIAL_MONITOR_LAUNCHED) return false;
  if (user.role === "ADMIN" || user.role === "COMMAND") return true;
  if (user.role === "VIEWER") return user.jtfId === null;
  if (user.role === "WFC_STAFF") {
    return (
      user.warfightingFunction === "CMO" ||
      user.warfightingFunction === "INTELLIGENCE" ||
      user.warfightingFunction === "MANEUVER"
    );
  }
  return false;
}

export function assertCanAccessSocialMonitor(user: SessionUser): void {
  if (!canAccessSocialMonitor(user)) {
    throw new ForbiddenError("Not authorized to access the Social Media Monitor");
  }
}

/** Only CMO actually owns Social Media Monitor — Intelligence/Maneuver can
 * view it (see canAccessSocialMonitor) but not log/edit/delete posts or
 * Social Listening reports there, and neither can COMMAND. */
export function canWriteSocialMonitor(user: SessionUser): boolean {
  if (!SOCIAL_MONITOR_LAUNCHED) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "WFC_STAFF" && user.warfightingFunction === "CMO";
}

export function assertCanWriteSocialMonitor(user: SessionUser): void {
  if (!canWriteSocialMonitor(user)) {
    throw new ForbiddenError("Not authorized to modify the Social Media Monitor");
  }
}

/**
 * Intelligence Update is viewable by ADMIN, COMMAND (read-only rollup —
 * same posture COMMAND already has on other aggregate views), a command-wide
 * VIEWER (jtfId === null — see canAccessSocialMonitor's doc comment; a
 * JTF-scoped VIEWER doesn't get this, since the feature itself isn't
 * JTF-scoped), and every WFC_STAFF function: INTELLIGENCE owns and writes
 * it, while CMO and MANEUVER get read-only cross-visibility (see
 * canWriteIntelligenceUpdate).
 */
export function canAccessIntelligenceUpdate(user: SessionUser): boolean {
  if (user.role === "ADMIN" || user.role === "COMMAND") return true;
  if (user.role === "VIEWER") return user.jtfId === null;
  if (user.role === "WFC_STAFF") {
    return (
      user.warfightingFunction === "INTELLIGENCE" ||
      user.warfightingFunction === "CMO" ||
      user.warfightingFunction === "MANEUVER"
    );
  }
  return false;
}

export function assertCanAccessIntelligenceUpdate(user: SessionUser): void {
  if (!canAccessIntelligenceUpdate(user)) {
    throw new ForbiddenError("Not authorized to access Intelligence Update");
  }
}

/**
 * JTF REDCON is a read-only, command-wide view of Unit Readiness
 * Condition broken down by JTF and Task Group — for ADMIN, COMMAND, and
 * every WFC_STAFF function to monitor readiness. There is no write
 * access here regardless of role; editing stays on the ADMIN-only Users
 * page (see UnitConditionCard / assertCanWriteJtf).
 */
export function canAccessJtfRedcon(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "COMMAND" || user.role === "WFC_STAFF";
}

export function assertCanAccessJtfRedcon(user: SessionUser): void {
  if (!canAccessJtfRedcon(user)) {
    throw new ForbiddenError("Not authorized to access JTF REDCON");
  }
}

export function canWriteIntelligenceUpdate(user: SessionUser): boolean {
  if (user.role === "ADMIN") return true;
  return user.role === "WFC_STAFF" && user.warfightingFunction === "INTELLIGENCE";
}

export function assertCanWriteIntelligenceUpdate(user: SessionUser): void {
  if (!canWriteIntelligenceUpdate(user)) {
    throw new ForbiddenError("Not authorized to modify Intelligence Update reports");
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

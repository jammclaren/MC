// Suggestion lists for the Intelligence Update form's free-text fields (see
// election-area-form-dialog.tsx's Province/Municipality/Barangay pattern —
// an <Input list="..."> + <datalist>, not a closed Select) — named threat
// groups shift over time, and Type of Activity, while WFC-Intelligence
// supplied this specific category-dependent list, is still manually typed
// rather than a locked dropdown, so these all stay suggestions, never a
// validated enum.
export const THREAT_GROUP_SUGGESTIONS = ["DI", "BIFF", "NPA", "ASG", "Unidentified"] as const;

export const POLITICAL_PARTY_SUGGESTIONS = ["UBJP", "BFP", "BGC", "MNLF-BAF"] as const;

/**
 * Threat Group and Political Party name two different kinds of actors —
 * a report's value for one must not double as the other, so whatever's
 * classified as a threat group stays out of the political-party field and
 * vice versa. Case-insensitive (catches "BIFF" vs "biff" as the same
 * collision, not just an exact string match). Returns null when there's
 * no conflict, otherwise a message explaining which field to fix.
 * Shared by the client form (pre-submit check) and the create/update API
 * routes (server-side enforcement) so the rule can't be bypassed by
 * calling the API directly.
 */
export function threatGroupPoliticalPartyConflict(
  threatGroup: string | null | undefined,
  politicalParty: string | null | undefined
): string | null {
  const tg = threatGroup?.trim().toLowerCase();
  const pp = politicalParty?.trim().toLowerCase();

  if (tg && pp && tg === pp) {
    return "Threat Group and Political Party can't be the same value on one report.";
  }
  if (pp && (THREAT_GROUP_SUGGESTIONS as readonly string[]).some((g) => g.toLowerCase() === pp)) {
    return `"${politicalParty}" is a known Threat Group — enter it under Threat Group, not Political Party.`;
  }
  if (tg && (POLITICAL_PARTY_SUGGESTIONS as readonly string[]).some((p) => p.toLowerCase() === tg)) {
    return `"${threatGroup}" is a known Political Party — enter it under Political Party, not Threat Group.`;
  }
  return null;
}

// jtfId null on an IntelMeeAsset means "TOW-WESTMIN" — equipment held by
// WESMINCOM itself, not a subordinate JTF (see IntelMeeAsset schema
// comment). Lives here, not in lib/queries/intel-mee.ts, because that file
// imports `prisma` — client components (e.g. the MEE cards/form) need this
// label without pulling the whole server-only Prisma/pg chain into the
// browser bundle.
export const TOW_WESTMIN_LABEL = "TOW-WESTMIN";

export const ACTIVITY_TYPES_BY_CATEGORY = {
  VIOLENT: [
    "Encounter",
    "Shooting",
    "Ambush",
    "Harassment",
    "Strafing",
    "Grenade Throwing",
    "Ballot Snatching",
    "IED/APM Attack",
  ],
  NON_VIOLENT: [
    "Campaign Rally",
    "Meeting",
    "Movement",
    "Surrender of Firearm",
    "Recovery of Suspected IED",
    "Consolidation",
    "Hostile Plan",
    "Apprehension",
    "Checkpoint Operation",
    "Surrender",
    "Discovery of UXO",
    "Sightings",
  ],
} as const;

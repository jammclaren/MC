// Suggestion lists for the Intelligence Update form's free-text fields (see
// election-area-form-dialog.tsx's Province/Municipality/Barangay pattern —
// an <Input list="..."> + <datalist>, not a closed Select) — named threat
// groups shift over time, and Type of Activity, while WFC-Intelligence
// supplied this specific category-dependent list, is still manually typed
// rather than a locked dropdown, so these all stay suggestions, never a
// validated enum.
export const THREAT_GROUP_SUGGESTIONS = ["DI", "BIFF", "NPA", "ASG", "Unidentified"] as const;

export const POLITICAL_PARTY_SUGGESTIONS = ["UBJP", "BFP", "BGC", "MNLF-BAF"] as const;

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

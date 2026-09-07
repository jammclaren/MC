// Suggestion lists for the Intelligence Update form's free-text fields (see
// election-area-form-dialog.tsx's Province/Municipality/Barangay pattern —
// an <Input list="..."> + <datalist>, not a closed Select) — named threat
// groups shift over time, and Type of Activity, while WFC-Intelligence
// supplied this specific category-dependent list, is still manually typed
// rather than a locked dropdown, so these all stay suggestions, never a
// validated enum.
export const THREAT_GROUP_SUGGESTIONS = ["DI", "BIFF", "NPA", "ASG", "Unidentified"] as const;

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

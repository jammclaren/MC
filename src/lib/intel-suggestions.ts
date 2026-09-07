// Suggestion lists for the Intelligence Update form's free-text fields (see
// election-area-form-dialog.tsx's Province/Municipality/Barangay pattern —
// an <Input list="..."> + <datalist>, not a closed Select) — the named
// threat groups and intelligence-discipline sources shift over time, so
// these are starting suggestions, never a validated enum.
export const THREAT_GROUP_SUGGESTIONS = ["DI", "BIFF", "NPA", "ASG", "Unidentified"] as const;

export const INTEL_SOURCE_SUGGESTIONS = ["HUMINT", "SIGINT", "OSINT", "IMINT", "GEOINT", "EMINT"] as const;

import type { SocialPostTopic } from "@/generated/prisma/client";

/**
 * Best-effort keyword classifier for incoming social posts — a starting
 * point staff always correct by hand, not a source of truth on its own.
 * Every post's classification field stays editable regardless of what
 * this suggests.
 */
const VIOLENT_KEYWORDS = [
  "shooting",
  "shot dead",
  "gunfire",
  "gun attack",
  "armed attack",
  "grenade",
  "explosion",
  "bomb",
  "ambush",
  "clash",
  "firefight",
  "killed",
  "killing",
  "murder",
  "kidnap",
  "abduct",
  "arson",
  "burned down",
  "burnt down",
  "violence",
  "violent",
  "attacked",
  "injured",
  "wounded",
  "stabbed",
  "hacked to death",
  "hostage",
  "rido",
];

export function classifyPostContent(content: string): "VIOLENT" | "NON_VIOLENT" {
  const lower = content.toLowerCase();
  return VIOLENT_KEYWORDS.some((keyword) => lower.includes(keyword)) ? "VIOLENT" : "NON_VIOLENT";
}

/** Human-readable label per topic — shared by the form dialog's Select,
 * the feed's badge, and the assessment card's "most-cited topics" line,
 * so all three always agree on wording. Confirmed with the user
 * 2026-09-10, replacing an earlier 10-value taxonomy that never had any
 * real data tagged under it. */
export const TOPIC_LABELS: Record<SocialPostTopic, string> = {
  ELECTION_RELATED: "Election Related",
  PEACE_INCLINED_ARMED_GROUPS: "Peace Inclined Armed Groups",
  ISO_RELATED: "ISO Related",
  ESO_RELATED: "ESO Related",
};

export const TOPIC_OPTIONS: { value: SocialPostTopic; label: string }[] = (
  Object.keys(TOPIC_LABELS) as SocialPostTopic[]
).map((value) => ({ value, label: TOPIC_LABELS[value] }));

// Checked in this order — first keyword match wins.
const TOPIC_KEYWORDS: { topic: SocialPostTopic; keywords: string[] }[] = [
  {
    // All about election topics: voting, candidates, campaign, election
    // fraud/vote buying, etc.
    topic: "ELECTION_RELATED",
    keywords: [
      "election",
      "halalan",
      "comelec",
      "candidate",
      "kandidato",
      "campaign",
      "ballot",
      "boto",
      "vote buying",
      "vote-buying",
      "vote selling",
      "election fraud",
      "poll fraud",
      "dagdag-bawas",
      "dagdag bawas",
      "ballot tampering",
      "rigged election",
      "voter education",
      "voter registration",
      "polling place",
      "precinct",
      "canvassing",
    ],
  },
  {
    // Groups engaged in the peace process — MILF/MNLF, decommissioning,
    // normalization — as opposed to hostile/unaligned armed groups.
    topic: "PEACE_INCLINED_ARMED_GROUPS",
    keywords: [
      "milf",
      "mnlf",
      "peace process",
      "peace agreement",
      "peace panel",
      "decommissioning",
      "decommissioned combatant",
      "bangsamoro islamic armed forces",
      "biaf",
      "normalization process",
      "camp transformation",
    ],
  },
  {
    // Internal Security Operations: terrorism, communism/NPA, insurgency.
    topic: "ISO_RELATED",
    keywords: [
      "terrorism",
      "terrorist",
      "extremist",
      "extremism",
      "communist",
      "communism",
      "new people's army",
      "npa",
      "cpp-npa",
      "insurgency",
      "insurgent",
      "ied",
      "bombing",
    ],
  },
  {
    // External Security Operations: West Philippine Sea, Sabah/Malaysia
    // conflict.
    topic: "ESO_RELATED",
    keywords: [
      "west philippine sea",
      "wps",
      "south china sea",
      "china coast guard",
      "chinese militia",
      "spratly",
      "scarborough",
      "ayungin",
      "sabah",
      "sabah claim",
      "malaysia territorial",
    ],
  },
];

/** Same disclaimer as classifyPostContent: a starting guess, always
 * staff-correctable. Returns null ("Unspecified" in the UI) rather than
 * forcing a guess when nothing matches. */
export function classifyPostTopic(content: string): SocialPostTopic | null {
  const lower = content.toLowerCase();
  for (const { topic, keywords } of TOPIC_KEYWORDS) {
    if (keywords.some((keyword) => lower.includes(keyword))) return topic;
  }
  return null;
}

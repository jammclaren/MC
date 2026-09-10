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
 * so all three always agree on wording. */
export const TOPIC_LABELS: Record<SocialPostTopic, string> = {
  VOTE_BUYING: "Vote Buying",
  ELECTION_FRAUD: "Election Fraud",
  CANDIDATE_PARTY_ATTACK: "Candidate/Party Attack",
  VOTER_EDUCATION: "Voter Education",
  ELECTION_VIOLENCE: "Election Violence",
  TERRORISM: "Terrorism",
  RIDO_CLAN_CONFLICT: "Rido/Clan Conflict",
  CRIMINALITY: "Criminality",
  PEACE_AND_ORDER: "Peace & Order",
  MISINFORMATION: "Misinformation",
};

export const TOPIC_OPTIONS: { value: SocialPostTopic; label: string }[] = (
  Object.keys(TOPIC_LABELS) as SocialPostTopic[]
).map((value) => ({ value, label: TOPIC_LABELS[value] }));

// Checked in this order — first keyword match wins, so a post naming both
// a general theme and a more specific one (e.g. "election violence" also
// containing "attack") lands in the more specific/first-listed bucket.
const TOPIC_KEYWORDS: { topic: SocialPostTopic; keywords: string[] }[] = [
  {
    topic: "VOTE_BUYING",
    keywords: ["vote buying", "vote-buying", "vote selling", "pera para sa boto", "binili ang boto"],
  },
  {
    topic: "ELECTION_FRAUD",
    keywords: ["election fraud", "poll fraud", "dagdag-bawas", "dagdag bawas", "ballot tampering", "rigged election", "rigging"],
  },
  {
    topic: "ELECTION_VIOLENCE",
    keywords: ["election violence", "poll violence", "election-related shooting", "election-related killing"],
  },
  {
    topic: "CANDIDATE_PARTY_ATTACK",
    keywords: ["black propaganda", "smear campaign", "candidate attack", "party attack", "maling akusasyon"],
  },
  {
    topic: "VOTER_EDUCATION",
    keywords: ["voter education", "paano bumoto", "how to vote", "voter registration", "comelec advisory"],
  },
  {
    topic: "TERRORISM",
    keywords: ["terrorism", "terrorist", "ied", "extremist", "extremism"],
  },
  {
    topic: "RIDO_CLAN_CONFLICT",
    keywords: ["rido", "clan war", "clan feud", "family feud"],
  },
  {
    topic: "CRIMINALITY",
    keywords: ["robbery", "theft", "carnapping", "carjacking", "drug trafficking", "criminality", "extortion"],
  },
  {
    topic: "PEACE_AND_ORDER",
    keywords: ["peace and order", "checkpoint", "curfew", "security operation", "law enforcement operation"],
  },
  {
    topic: "MISINFORMATION",
    keywords: ["fake news", "misinformation", "disinformation", "fact check", "false claim", "hoax"],
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

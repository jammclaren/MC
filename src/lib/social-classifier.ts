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

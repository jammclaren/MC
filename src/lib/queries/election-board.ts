import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import { safePercent } from "@/lib/percentages";

/** Province → owning JTF, confirmed with the user for the barangay
 * categorization import and reused here so a province's AOR stays
 * consistent across every feature that needs to know which JTF writes to
 * it. Provinces outside this map (not yet tracked anywhere in the app) get
 * no default JTF — the page falls back to letting only ADMIN add data for
 * them until an explicit mapping exists. */
export const PROVINCE_TO_JTF: Record<string, string> = {
  "Maguindanao del Norte": "JTF CENTRAL",
  "Maguindanao del Sur": "JTF CENTRAL",
  "Cotabato City": "JTF CENTRAL",
  "SGA-BARMM": "JTF CENTRAL",
  "Lanao del Sur": "JTF ZAMPELAN",
  Basilan: "JTF ORION",
  "Tawi-Tawi": "JTF POSEIDON",
};

export interface BoardCandidate {
  id: string;
  district: string | null;
  nameOnBallot: string;
  partyAbbreviation: string | null;
  partyName: string | null;
  isCocFiler: boolean;
  votesEncoded: number;
  voteSharePct: number | null;
  sourceNote: string | null;
}

export interface BoardParty {
  abbreviation: string;
  name: string;
  candidateCount: number;
  votesEncoded: number;
}

export interface ElectionBoardData {
  province: string;
  contestantCount: number;
  partyLabelCount: number;
  votesEncoded: number;
  reportingPct: number;
  leaderboard: BoardCandidate[];
  parties: BoardParty[];
  candidates: BoardCandidate[];
}

/** Election data is public COMELEC roster/vote-count info, not JTF
 * operational intel — readable command-wide like other rollup queries,
 * regardless of the candidate's owning JTF (used only to scope writes). */
export async function listElectionProvinces(user: SessionUser): Promise<string[]> {
  const scopeJtfId = scopeJtfFilter(user, undefined, { allowRollup: true });
  const rows = await prisma.candidate.findMany({
    where: { jtfId: scopeJtfId },
    select: { province: true },
    distinct: ["province"],
    orderBy: { province: "asc" },
  });
  return rows.map((r) => r.province);
}

export async function getElectionBoardData(
  user: SessionUser,
  province: string
): Promise<ElectionBoardData> {
  const scopeJtfId = scopeJtfFilter(user, undefined, { allowRollup: true });

  const candidates = await prisma.candidate.findMany({
    where: { jtfId: scopeJtfId, province },
    include: { party: true },
    orderBy: [{ votesEncoded: "desc" }, { nameOnBallot: "asc" }],
  });

  const votesEncoded = candidates.reduce((sum, c) => sum + c.votesEncoded, 0);

  const toBoardCandidate = (c: (typeof candidates)[number]): BoardCandidate => ({
    id: c.id,
    district: c.district,
    nameOnBallot: c.nameOnBallot,
    partyAbbreviation: c.party?.abbreviation ?? null,
    partyName: c.party?.name ?? null,
    isCocFiler: c.isCocFiler,
    votesEncoded: c.votesEncoded,
    voteSharePct: safePercent(c.votesEncoded, votesEncoded),
    sourceNote: c.sourceNote,
  });

  const partyMap = new Map<string, BoardParty>();
  for (const c of candidates) {
    if (!c.party) continue;
    const existing = partyMap.get(c.party.abbreviation);
    if (existing) {
      existing.candidateCount += 1;
      existing.votesEncoded += c.votesEncoded;
    } else {
      partyMap.set(c.party.abbreviation, {
        abbreviation: c.party.abbreviation,
        name: c.party.name,
        candidateCount: 1,
        votesEncoded: c.votesEncoded,
      });
    }
  }
  const parties = Array.from(partyMap.values()).sort(
    (a, b) => b.candidateCount - a.candidateCount
  );

  // Reporting-percentage infrastructure (per-precinct results submission)
  // doesn't exist yet — 0 until votes are actually encoded, same as the
  // reference board pre-election. See ElectionOpsStatus for the analogous
  // BPE-deployment tracker this could eventually plug into.
  const reportingPct = votesEncoded > 0 ? 100 : 0;

  return {
    province,
    contestantCount: candidates.length,
    partyLabelCount: partyMap.size,
    votesEncoded,
    reportingPct,
    leaderboard: candidates.map(toBoardCandidate),
    parties,
    candidates: candidates
      .slice()
      .sort((a, b) => a.nameOnBallot.localeCompare(b.nameOnBallot))
      .map(toBoardCandidate),
  };
}

import { prisma } from "@/lib/prisma";
import { scopeJtfFilter, type SessionUser } from "@/lib/rbac";
import type { ThreatCategory } from "@/generated/prisma/client";

export interface IndicatorTableRow {
  indicatorId: string;
  name: string;
  subgroup: string | null;
  targetYE: number | null;
  totalsByQuarter: Record<string, number>;
  cumulative: number;
  psrTotal: number;
  npsrTotal: number;
  hasForceStatusSplit: boolean;
}

export interface IndicatorTable {
  quarters: string[];
  rows: IndicatorTableRow[];
}

export async function getIndicatorTable(
  user: SessionUser,
  category: ThreatCategory,
  jtfId?: string | null
): Promise<IndicatorTable> {
  // Indicator counts are aggregate-only (summed per quarter, no per-record
  // detail), so this is a rollup view JTF_COMMANDER may see command-wide.
  const scopeJtfId = scopeJtfFilter(user, jtfId, { allowRollup: true });

  const indicators = await prisma.indicator.findMany({
    where: { category },
    include: { records: { where: { jtfId: scopeJtfId } } },
    orderBy: [{ subgroup: "asc" }, { name: "asc" }],
  });

  const quarterSet = new Set<string>();
  for (const indicator of indicators) {
    for (const record of indicator.records) {
      quarterSet.add(record.quarter);
    }
  }
  const quarters = Array.from(quarterSet).sort();

  const rows: IndicatorTableRow[] = indicators.map((indicator) => {
    const totalsByQuarter: Record<string, number> = {};
    let psrTotal = 0;
    let npsrTotal = 0;
    let hasForceStatusSplit = false;

    for (const record of indicator.records) {
      totalsByQuarter[record.quarter] = (totalsByQuarter[record.quarter] ?? 0) + record.count;
      if (record.forceStatus === "PSR") {
        psrTotal += record.count;
        hasForceStatusSplit = true;
      } else if (record.forceStatus === "NPSR") {
        npsrTotal += record.count;
        hasForceStatusSplit = true;
      }
    }

    const cumulative = Object.values(totalsByQuarter).reduce((sum, v) => sum + v, 0);

    return {
      indicatorId: indicator.id,
      name: indicator.name,
      subgroup: indicator.subgroup,
      targetYE: indicator.targetYE,
      totalsByQuarter,
      cumulative,
      psrTotal,
      npsrTotal,
      hasForceStatusSplit,
    };
  });

  return { quarters, rows };
}

export interface RidoTableRow {
  jtfId: string;
  jtfName: string;
  quarter: string;
  llesPags: number;
  mnlf: number;
  milf: number;
  total: number;
}

export async function getRidoTable(
  user: SessionUser,
  jtfId?: string | null
): Promise<RidoTableRow[]> {
  // RIDO settlements are per-quarter counts, not individual-case detail —
  // also a rollup view JTF_COMMANDER may see command-wide.
  const scopeJtfId = scopeJtfFilter(user, jtfId, { allowRollup: true });

  const settlements = await prisma.ridoSettlement.findMany({
    where: { jtfId: scopeJtfId },
    include: { jtf: { select: { name: true } } },
    orderBy: { quarter: "asc" },
  });

  const grouped = new Map<string, RidoTableRow>();
  for (const settlement of settlements) {
    const key = `${settlement.jtfId}|${settlement.quarter}`;
    const existing = grouped.get(key) ?? {
      jtfId: settlement.jtfId,
      jtfName: settlement.jtf.name,
      quarter: settlement.quarter,
      llesPags: 0,
      mnlf: 0,
      milf: 0,
      total: 0,
    };
    if (settlement.involving === "LLEs/PAGs") existing.llesPags += settlement.count;
    if (settlement.involving === "MNLF") existing.mnlf += settlement.count;
    if (settlement.involving === "MILF") existing.milf += settlement.count;
    existing.total += settlement.count;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values());
}

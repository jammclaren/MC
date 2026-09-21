import { prisma } from "@/lib/prisma";

export const SIPS_DECLARATION_COUNT_ID = "global";

export interface SipsDeclarationCountRow {
  municipalCount: number;
  provinceCount: number;
  updatedByName: string | null;
  updatedAt: string | null;
}

/** The CMO-maintained SIPS declaration tally — a single current-state row
 * (see SipsDeclarationCount in schema.prisma), same shape as
 * AlertLevelStatus. No row yet means it's never been set, which defaults
 * to zero with no attribution rather than an error. */
export async function getSipsDeclarationCount(): Promise<SipsDeclarationCountRow> {
  const row = await prisma.sipsDeclarationCount.findUnique({
    where: { id: SIPS_DECLARATION_COUNT_ID },
    select: {
      municipalCount: true,
      provinceCount: true,
      updatedAt: true,
      updatedBy: { select: { name: true } },
    },
  });
  if (!row) {
    return { municipalCount: 0, provinceCount: 0, updatedByName: null, updatedAt: null };
  }
  return {
    municipalCount: row.municipalCount,
    provinceCount: row.provinceCount,
    updatedByName: row.updatedBy.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}

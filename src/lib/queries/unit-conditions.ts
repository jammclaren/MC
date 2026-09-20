import { prisma } from "@/lib/prisma";
import { UNIT_CONDITION_CATEGORIES } from "@/lib/unit-condition";

export interface UnitConditionRow {
  jtfId: string;
  jtfName: string;
  personnelPct: number;
  equipmentPct: number;
  maintenancePct: number;
  facilityPct: number;
  trainingPct: number;
  /** Average of the five category percentages, rounded — null when no
   * rating has ever been submitted for this JTF, so callers can render
   * "Not set" instead of a misleading 0%/R4. */
  overallPct: number | null;
  updatedAt: Date | null;
}

/** One row per JTF, ordered by name, with the current Unit Condition
 * rating joined in (or all-null placeholders when a JTF has never had one
 * submitted). */
export async function listUnitConditions(): Promise<UnitConditionRow[]> {
  const jtfs = await prisma.jTF.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, unitCondition: true },
  });

  return jtfs.map((jtf) => {
    const c = jtf.unitCondition;
    if (!c) {
      return {
        jtfId: jtf.id,
        jtfName: jtf.name,
        personnelPct: 0,
        equipmentPct: 0,
        maintenancePct: 0,
        facilityPct: 0,
        trainingPct: 0,
        overallPct: null,
        updatedAt: null,
      };
    }
    const overallPct = Math.round(
      UNIT_CONDITION_CATEGORIES.reduce((sum, cat) => sum + c[cat.key], 0) /
        UNIT_CONDITION_CATEGORIES.length
    );
    return {
      jtfId: jtf.id,
      jtfName: jtf.name,
      personnelPct: c.personnelPct,
      equipmentPct: c.equipmentPct,
      maintenancePct: c.maintenancePct,
      facilityPct: c.facilityPct,
      trainingPct: c.trainingPct,
      overallPct,
      updatedAt: c.updatedAt,
    };
  });
}

import { prisma } from "@/lib/prisma";
import type { AlertLevelCode } from "@/lib/alert-level";

export const ALERT_LEVEL_STATUS_ID = "global";

export interface AlertLevelStatusRow {
  level: AlertLevelCode;
  updatedByName: string | null;
  updatedAt: Date | null;
}

/** The command-wide Alert Level Status — a single current-state row (see
 * AlertLevelStatus in schema.prisma). No row yet means it's never been
 * set, which defaults to WHITE with no attribution rather than an error. */
export async function getAlertLevelStatus(): Promise<AlertLevelStatusRow> {
  const row = await prisma.alertLevelStatus.findUnique({
    where: { id: ALERT_LEVEL_STATUS_ID },
    select: { level: true, updatedAt: true, updatedBy: { select: { name: true } } },
  });
  if (!row) {
    return { level: "WHITE", updatedByName: null, updatedAt: null };
  }
  return { level: row.level, updatedByName: row.updatedBy.name, updatedAt: row.updatedAt };
}

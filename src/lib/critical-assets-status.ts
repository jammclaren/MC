export interface UnserviceableTotals {
  totalWavUnserviceable: number;
  totalTavUnserviceable: number;
  totalArtilleryUnserviceable: number;
  totalNavalUnserviceable: number;
}

export interface CriticalAssetsStatus {
  value: string;
  tone: "good" | "critical";
}

/** "Status of Critical Assets" reads only the *Unserviceable totals (see
 * TaskGroup in schema.prisma) — "Serviceable" when every category is 0
 * across the viewer's scope, otherwise the specifics, so command staff
 * see exactly what's down instead of a bare count. Shared by Overview
 * and Daily SITREP's Recapitulation, which both surface the same
 * command-wide-or-JTF-scoped totals from getSitRepData/getOverviewData. */
export function criticalAssetsStatus(totals: UnserviceableTotals): CriticalAssetsStatus {
  const parts: string[] = [];
  if (totals.totalWavUnserviceable > 0) parts.push(`${totals.totalWavUnserviceable} WAV`);
  if (totals.totalTavUnserviceable > 0) parts.push(`${totals.totalTavUnserviceable} TAV`);
  if (totals.totalArtilleryUnserviceable > 0) parts.push(`${totals.totalArtilleryUnserviceable} Artillery`);
  if (totals.totalNavalUnserviceable > 0) parts.push(`${totals.totalNavalUnserviceable} Naval`);
  if (parts.length === 0) return { value: "Serviceable", tone: "good" };
  return { value: `${parts.join(", ")} Unserviceable`, tone: "critical" };
}

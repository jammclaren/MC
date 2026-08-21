/**
 * The source Excel sheets compute percentages with formulas that break into
 * #DIV/0! whenever the denominator is missing or zero. Every percentage in
 * this app must go through this function instead of being stored or computed
 * ad hoc, so that class of bug can't recur.
 *
 * Returns null (not NaN/Infinity) when the percentage can't be computed.
 */
export function safePercent(
  numerator: number | null | undefined,
  denominator: number | null | undefined
): number | null {
  if (numerator == null || denominator == null || denominator <= 0) {
    return null;
  }
  return (numerator / denominator) * 100;
}

import type { PeriodMetrics } from "@/lib/queries/social-monitor-dashboard";

/**
 * IO Cell Officer-style recommended actions, generated deterministically
 * from the Current Week vs Previous Week comparison already computed for
 * the dashboard — no free-text generation, so every line traces back to a
 * real count on file.
 */
const TOPIC_ACTIONS: Record<string, (count: number) => string> = {
  "Election Related": (n) =>
    `Election Related content leads this week's volume (${n} post${n === 1 ? "" : "s"}) — sustain voter-education and transparency messaging to counter disinformation risk ahead of the BARMM Parliamentary Elections 2026.`,
  "Peace Inclined Armed Groups": (n) =>
    `Peace Inclined Armed Groups content was logged (${n} post${n === 1 ? "" : "s"}) — coordinate with the peace-process liaison desk (MILF/MNLF/BARMM transition) to keep public messaging consistent with the peace agreement narrative and preserve the peace in Western Mindanao.`,
  "ISO Related": (n) =>
    `ISO Related (terrorism/communism) content was logged (${n} post${n === 1 ? "" : "s"}) — refer to WFC-Intelligence for threat-group correlation and weigh a counter-terrorism public-awareness push in the affected communities.`,
  "ESO Related": (n) =>
    `ESO Related (West Philippine Sea/Sabah) content was logged (${n} post${n === 1 ? "" : "s"}) — route to the external-affairs desk before any public response, given the external-sovereignty sensitivity.`,
};

function pctChange(selected: number, compared: number): number | null {
  if (compared === 0) return null;
  return ((selected - compared) / compared) * 100;
}

export function computeRecommendedActions(selected: PeriodMetrics, compared: PeriodMetrics): string[] {
  const actions: string[] = [];

  if (selected.violentCount > 0) {
    actions.push(
      `Verify and respond to the ${selected.violentCount} violent-classified post${selected.violentCount === 1 ? "" : "s"} logged this week; log each in the Intelligence Update workspace (Threat Group / MGRS / Source) so it feeds the command-wide threat picture rather than staying siloed here.`
    );
  }

  if (selected.highlightedCount > 0) {
    actions.push(
      `Prioritize the ${selected.highlightedCount} highlighted post${selected.highlightedCount === 1 ? "" : "s"} for IO Cell fact-check and counter-messaging before the next 2200H-2200H reporting cycle closes.`
    );
  }

  const volumeChange = pctChange(selected.totalCount, compared.totalCount);
  if (volumeChange === null) {
    if (selected.totalCount > 0) {
      actions.push(
        "No Previous Week baseline is on file — maintain continuous weekly monitoring so a real week-on-week trend can be established."
      );
    }
  } else if (volumeChange > 10) {
    actions.push(
      `Posting volume rose ${volumeChange.toFixed(0)}% week-on-week — increase monitoring cadence and prepare pre-emptive public-information messaging on the topics below.`
    );
  } else if (volumeChange < -10) {
    actions.push(
      `Posting volume fell ${Math.abs(volumeChange).toFixed(0)}% week-on-week — maintain current monitoring cadence; no surge response indicated.`
    );
  } else {
    actions.push("Posting volume held roughly steady week-on-week — maintain standing monitoring posture.");
  }

  for (const t of selected.topicCounts.slice(0, 2)) {
    const buildAction = TOPIC_ACTIONS[t.label];
    if (buildAction) actions.push(buildAction(t.count));
  }

  if (selected.unclassifiedCount > 0) {
    actions.push(
      `Complete Violent/Non-Violent classification on the ${selected.unclassifiedCount} unclassified post${selected.unclassifiedCount === 1 ? "" : "s"} on file so it is captured in threat trend analysis.`
    );
  }

  if (selected.totalCount > 0 && selected.autoCount === 0) {
    actions.push(
      "No posts were auto-fetched this week — verify the Facebook sync token/job before the next reporting cycle so coverage isn't limited to manual entries."
    );
  }

  actions.push(
    "Cross-reference any actor, location, or threat-group mention surfaced here against the Intelligence Update workspace's Overall Analysis & Assessment to keep the province-level BARMM 2026 election security picture aligned."
  );

  return actions;
}

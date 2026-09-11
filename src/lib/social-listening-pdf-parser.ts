/**
 * Deterministic, pattern-based extraction from a Social Listening report
 * PDF's raw text layer — no AI/OCR involved. Only fields the text clearly
 * matches are returned; everything else is left for staff to fill in, and
 * whatever IS extracted is still shown in the form for staff to review and
 * correct before saving (never auto-submitted).
 */

export interface ParsedIssueRow {
  label: string;
  mentions: number;
  engagementLabel: string;
  reachLabel: string;
  authors: number;
  status: string;
  riskLevel: string;
}

export interface ParsedPlatformRow {
  platform: string;
  mentions: number;
}

export interface ParsedActivityRow {
  title: string;
  subtitle: string;
  sourceUrl: string | null;
  analysis: string;
  assessment: string;
}

export interface ParsedSocialListeningReport {
  uniqueSources: number | null;
  engagementLabel: string | null;
  overallRiskLevel: string | null;
  riskRationale: string | null;
  dominantNarratives: string[];
  emergingNarratives: string[];
  indicatorsToWatch: string[];
  issues: ParsedIssueRow[];
  platformMentions: ParsedPlatformRow[];
  significantActivities: ParsedActivityRow[];
}

const NUMBER_LABEL = /^[\d][\d,.]*[KMB%]?$/i;

function toInt(token: string): number {
  return Math.round(Number(token.replace(/,/g, "")));
}

function linesOf(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** A single labeled figure appearing on its own line right after a known
 * header line (e.g. "UNIQUE SOURCES" then "144" on the next line), the
 * layout real exports commonly use for KPI tiles. */
function findKpiValue(lines: string[], header: RegExp): string | null {
  const idx = lines.findIndex((l) => header.test(l));
  if (idx === -1) return null;
  for (let i = idx + 1; i < Math.min(idx + 3, lines.length); i++) {
    if (NUMBER_LABEL.test(lines[i])) return lines[i];
  }
  return null;
}

function findSectionBullets(lines: string[], header: RegExp, stopHeaders: RegExp[]): string[] {
  const idx = lines.findIndex((l) => header.test(l));
  if (idx === -1) return [];
  const bullets: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (stopHeaders.some((h) => h.test(line))) break;
    // A PDF's text layer breaks a bullet's sentence across several lines
    // wherever the page itself wraps it — only a line starting with an
    // actual glyph is a new bullet; anything else is that wrapped bullet
    // continuing, and gets appended rather than treated as its own entry.
    const glyphMatch = line.match(/^[•\-*]\s*(.+)$/);
    if (glyphMatch) {
      bullets.push(glyphMatch[1].trim());
    } else if (bullets.length > 0 && line.trim()) {
      bullets[bullets.length - 1] += ` ${line.trim()}`;
    }
  }
  return bullets;
}

/** Issue Map rows: "<label> <mentions> <engagement> <reach> <authors> <status words> <risk words>",
 * tolerant of the exact spacing/line-splitting a PDF's text layer produces. */
function parseIssueRows(lines: string[]): ParsedIssueRow[] {
  const headerIdx = lines.findIndex(
    (l) => /issue/i.test(l) && /mentions/i.test(l) && /engagement/i.test(l)
  );
  if (headerIdx === -1) return [];

  const rows: ParsedIssueRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^(narratives|assessment|recommend|platform distribution|significant activities)/i.test(line)) break;
    // Status is free-text and may be multiple words ("HIGH VISIBILITY");
    // risk is always a single hyphenated token ("MODERATE-HIGH") — so
    // status is greedy and risk takes whatever single token is left.
    const match = line.match(
      /^(.+?)\s+([\d,]+)\s+([\d.,]+[KMB]?)\s+([\d.,]+[KMB]?)\s+(\d+)\s+(.+)\s+(\S+)$/
    );
    if (!match) continue;
    const [, label, mentions, engagementLabel, reachLabel, authors, status, riskLevel] = match;
    rows.push({
      label: label.trim(),
      mentions: toInt(mentions),
      engagementLabel: engagementLabel.trim(),
      reachLabel: reachLabel.trim(),
      authors: toInt(authors),
      status: status.trim(),
      riskLevel: riskLevel.trim(),
    });
  }
  return rows;
}

/** Platform Distribution rows: "<platform name> <mentions>". */
function parsePlatformRows(lines: string[]): ParsedPlatformRow[] {
  const headerIdx = lines.findIndex((l) => /platform distribution/i.test(l));
  if (headerIdx === -1) return [];

  const rows: ParsedPlatformRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^(narratives|assessment|recommend|issue map|significant activities)/i.test(line)) break;
    const match = line.match(/^(.+?)\s+([\d,]+)$/);
    if (!match) continue;
    rows.push({ platform: match[1].trim(), mentions: toInt(match[2]) });
  }
  return rows;
}

/** Significant Activities: numbered entries ("1.) Title" / "1. Title")
 * followed by a Source line and Analysis:/Assessment: paragraphs. */
function parseActivities(text: string): ParsedActivityRow[] {
  const entryPattern = /^\s*\d+[.)]+\s+(.+)$/gm;
  const starts: { index: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryPattern.exec(text))) {
    starts.push({ index: m.index, title: m[1].trim() });
  }
  if (starts.length === 0) return [];

  const activities: ParsedActivityRow[] = [];
  for (let i = 0; i < starts.length; i++) {
    const chunkStart = starts[i].index;
    const chunkEnd = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const chunk = text.slice(chunkStart, chunkEnd);

    const sourceMatch = chunk.match(/Source:?\s*(https?:\/\/\S+)/i);
    const analysisMatch = chunk.match(/Analysis:\s*([\s\S]*?)(?=Assessment:|$)/i);
    const assessmentMatch = chunk.match(/Assessment:\s*([\s\S]*)$/i);

    activities.push({
      title: starts[i].title,
      subtitle: "",
      sourceUrl: sourceMatch ? sourceMatch[1] : null,
      analysis: analysisMatch ? analysisMatch[1].trim().replace(/\s+/g, " ") : "",
      assessment: assessmentMatch ? assessmentMatch[1].trim().replace(/\s+/g, " ") : "",
    });
  }
  return activities.filter((a) => a.analysis || a.assessment);
}

export function parseSocialListeningPdfText(text: string): ParsedSocialListeningReport {
  const lines = linesOf(text);

  const uniqueSourcesRaw = findKpiValue(lines, /^unique sou?rces$/i);
  const engagementLabel = findKpiValue(lines, /^engagement$/i);

  const stopHeaders = [
    /dominant narratives/i,
    /emerging.*narratives/i,
    /indicators to watch/i,
    /overall risk level/i,
    /assessment/i,
    /recommend/i,
    /significant activities/i,
  ];

  const riskLineIdx = lines.findIndex((l) => /overall risk level/i.test(l));
  let overallRiskLevel: string | null = null;
  let riskRationale: string | null = null;
  if (riskLineIdx !== -1) {
    // Only pull in extra lines if the em/en-dash separator hasn't shown
    // up yet (a wrapped sentence) — never run past the next section.
    let collected = lines[riskLineIdx];
    let i = riskLineIdx;
    while (!/[—–]/.test(collected) && i + 1 < lines.length && !stopHeaders.some((h) => h.test(lines[i + 1]))) {
      i++;
      collected += " " + lines[i];
    }
    const riskLine = collected.replace(/overall risk level:?/i, "").trim();
    const [level, ...rest] = riskLine.split(/[—–]/);
    overallRiskLevel = level?.trim() || null;
    riskRationale = rest.join(" ").trim() || null;
  }

  return {
    uniqueSources: uniqueSourcesRaw ? toInt(uniqueSourcesRaw) : null,
    engagementLabel,
    overallRiskLevel,
    riskRationale,
    dominantNarratives: findSectionBullets(lines, /^dominant narratives$/i, stopHeaders),
    emergingNarratives: findSectionBullets(lines, /emerging.*narratives/i, stopHeaders),
    indicatorsToWatch: findSectionBullets(lines, /^indicators to watch$/i, stopHeaders),
    issues: parseIssueRows(lines),
    platformMentions: parsePlatformRows(lines),
    significantActivities: parseActivities(text),
  };
}

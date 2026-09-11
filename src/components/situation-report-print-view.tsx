import { Fragment } from "react";

/**
 * Print-only rendering of the Daily Summary of Reports plain-text draft —
 * the editable textarea stays plain text (still hand-editable), but the
 * printed/PDF copy gets real headings, bullet lists, and a fixed set of
 * key terms wrapped in <mark> so a reader scanning a printout can spot
 * severity calls and named units/provinces at a glance. No AI/NLP: this is
 * a deterministic keyword list, same "no fabrication" spirit as every
 * other assessment in this app — it only styles text that's already there.
 */

// Kept as a small standalone list (not imported from election-board.ts)
// so this stays a plain client-safe component with no server/Prisma
// import chain — update alongside PROVINCE_TO_JTF if the roster changes.
const HIGHLIGHT_TERMS = [
  "MODERATE-HIGH",
  "LOW-MODERATE",
  "HIGH VISIBILITY",
  "CONTINUING ACTIVE",
  "CRITICAL",
  "ELEVATED",
  "MODERATE",
  "SENSITIVE",
  "HIGH",
  "LOW",
  "INCREASING",
  "DECREASING",
  "FALSE",
  "MISLEADING",
  "DISINFORMATION",
  "UNVERIFIED",
  "FLAGGED",
  "JTF CENTRAL",
  "JTF ZAMPELAN",
  "JTF ORION",
  "JTF POSEIDON",
  "Maguindanao del Norte",
  "Maguindanao del Sur",
  "Cotabato City",
  "SGA-BARMM",
  "Lanao del Sur",
  "Basilan",
  "Tawi-Tawi",
].sort((a, b) => b.length - a.length);

const HIGHLIGHT_REGEX = new RegExp(
  `\\b(${HIGHLIGHT_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|")})\\b`,
  "gi"
);

function highlightKeyTerms(text: string): React.ReactNode {
  const parts = text.split(HIGHLIGHT_REGEX);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>
  );
}

// A real top-level section header ("1. EXECUTIVE SUMMARY") is flush-left
// with no leading indent; numbered sub-items like Social Listening's
// "  1. <activity title>" are always indented, which is what actually
// distinguishes the two once both are trimmed for display.
const SECTION_HEADER_TEXT = /^\d+\.\s+[A-Z]/;
const SUBLABEL_TEXT = /:$/;

export function SituationReportPrintView({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  function flushBullets(key: string) {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="my-1 list-disc pl-6">
        {bulletBuffer.map((b, i) => (
          <li key={i}>{highlightKeyTerms(b)}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  lines.forEach((line, i) => {
    const isIndented = line.length > 0 && line !== line.trimStart();
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[•-]\s*(.+)$/);

    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      return;
    }
    flushBullets(`ul-${i}`);

    if (trimmed === "") {
      blocks.push(<div key={i} className="h-3" />);
    } else if (i === 0) {
      blocks.push(
        <h1 key={i} className="mb-1 text-[15pt] font-bold uppercase">
          {trimmed}
        </h1>
      );
    } else if (!isIndented && SECTION_HEADER_TEXT.test(trimmed)) {
      blocks.push(
        <h2 key={i} className="mt-3 mb-1 text-[13pt] font-bold uppercase">
          {trimmed}
        </h2>
      );
    } else if (!isIndented && SUBLABEL_TEXT.test(trimmed)) {
      blocks.push(
        <p key={i} className="mt-2 font-semibold">
          {highlightKeyTerms(trimmed)}
        </p>
      );
    } else {
      blocks.push(<p key={i}>{highlightKeyTerms(line)}</p>);
    }
  });
  flushBullets("ul-end");

  return <div className="print-report-body">{blocks}</div>;
}

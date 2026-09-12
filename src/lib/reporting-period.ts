// The command's standard daily reporting cycle — 2200H to 2200H (Asia/
// Manila), not calendar midnight-to-midnight. Shared by every "reports for
// the day" figure across the dashboard (Daily Summary of Reports, Intel
// Update's daily count, etc.) so they all agree on exactly what "today"
// means rather than each page rolling its own rolling-24h or midnight
// boundary.

const REPORT_WINDOW_START_HOUR_UTC = 14; // 2200H Asia/Manila (UTC+8) == 1400 UTC

/** Asia/Manila is UTC+8 with no DST — shifting "now" forward 8 hours before
 * slicing the UTC date string gives the Manila calendar date without
 * needing an Intl call for something this simple. */
export function todayManilaIso(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The reporting day `date` (a Manila calendar date, "YYYY-MM-DD") covers
 * 2200H the day before through 2200H on `date` itself. */
export function reportWindow(date: string): { start: Date; end: Date } {
  const end = new Date(`${date}T${String(REPORT_WINDOW_START_HOUR_UTC).padStart(2, "0")}:00:00.000Z`);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

/** The reporting day "now" currently falls within — before 2200H Manila
 * time, that's still today's Manila date (its window opened yesterday
 * evening and doesn't close until this evening); from 2200H on, the
 * window has rolled over to tomorrow's Manila date. */
export function currentReportWindow(): { date: string; start: Date; end: Date } {
  let date = todayManilaIso();
  let window = reportWindow(date);
  if (Date.now() >= window.end.getTime()) {
    date = addDaysIso(date, 1);
    window = reportWindow(date);
  }
  return { date, ...window };
}

export function manilaTimeLabel(d: Date): string {
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

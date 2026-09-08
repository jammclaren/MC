/** "Sep 7, 21:45" — 24-hour Asia/Manila timestamp, shared by every place
 * that displays a submission time (JTF/Intel overall assessments). */
export function formatTimestamp24h(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

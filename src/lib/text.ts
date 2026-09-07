/** Shortens free text for display (chart labels, legends) without losing
 * the original — pair with a `title`/tooltip elsewhere for the full text. */
export function truncateLabel(label: string, maxLength = 24): string {
  return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label;
}

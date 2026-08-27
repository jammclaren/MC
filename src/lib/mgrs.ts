import { toPoint } from "mgrs";

/** Parses an MGRS string into a [lat, lng] pair, or returns an error
 * message. `mgrs.toPoint` throws on malformed input, so this wraps that in
 * a result the form can render inline instead of a thrown exception. */
export function parseMgrs(raw: string): { lat: number; lng: number } | { error: string } {
  const trimmed = raw.trim().toUpperCase().replaceAll(" ", "");
  if (!trimmed) return { error: "Enter an MGRS grid reference" };
  try {
    const [lng, lat] = toPoint(trimmed);
    return { lat, lng };
  } catch {
    return { error: "Not a valid MGRS reference (e.g. 51NUA6789054321)" };
  }
}

import { forward, toPoint } from "mgrs";

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

/** Inverse of parseMgrs — renders stored lat/lng back to an MGRS grid
 * reference for display (nothing stores the raw MGRS string, see
 * IntelUpdate/Incident schema comments). `mgrs.forward` throws on an
 * out-of-range lat/lng (e.g. a manually-typed coordinate with a dropped
 * decimal point) — this has reached production data, and a thrown error
 * here previously crashed the whole page that record appeared on rather
 * than just that one field, so it's wrapped the same way parseMgrs is. */
export function toMgrs(lat: number, lng: number): string {
  try {
    return forward([lng, lat]);
  } catch {
    return "—";
  }
}

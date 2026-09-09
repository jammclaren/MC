import { createHash } from "crypto";

export interface DeviceInfo {
  deviceLabel: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
}

/** Small regex-based UA parse — good enough for "what is this device" in an
 * admin review list, not meant to be a full device-detection library. */
export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent || "";

  let os = "Unknown OS";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone/i.test(ua)) os = "iOS";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Unknown Browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/crios\//i.test(ua)) browser = "Chrome";
  else if (/fxios\//i.test(ua)) browser = "Firefox";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  let deviceType: DeviceInfo["deviceType"] = "Desktop";
  if (/ipad|tablet/i.test(ua)) deviceType = "Tablet";
  else if (/mobi|iphone|android/i.test(ua)) deviceType = "Mobile";

  return { deviceLabel: `${browser} on ${os}`, deviceType };
}

export interface RequestMeta {
  userAgent: string;
  ipAddress: string | null;
  location: string | null;
}

/** Reads the standard Vercel edge geolocation headers — no external
 * geolocation API or key needed, just approximate city/region/country. */
export function extractRequestMeta(request: Request): RequestMeta {
  const userAgent = request.headers.get("user-agent") ?? "";
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

  // Vercel percent-encodes the city header (it can contain non-ASCII chars).
  const rawCity = request.headers.get("x-vercel-ip-city");
  const city = rawCity ? decodeURIComponent(rawCity) : null;
  const region = request.headers.get("x-vercel-ip-country-region");
  const country = request.headers.get("x-vercel-ip-country");
  const location = [city, region, country].filter(Boolean).join(", ") || null;

  return { userAgent, ipAddress, location };
}

/** Stable per-(user, browser) fingerprint so repeat logins from the same
 * device reuse the same UserDevice row instead of re-prompting every time. */
export function hashDeviceFingerprint(userId: string, userAgent: string, ipAddress: string | null): string {
  return createHash("sha256").update(`${userId}|${userAgent}|${ipAddress ?? ""}`).digest("hex");
}

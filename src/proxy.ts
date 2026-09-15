import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

function clearSessionCookies(response: NextResponse) {
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
  return response;
}

const PUBLIC_PATHS = ["/login", "/manifest.webmanifest"];

// Vercel Cron triggers these with no browser session, only a shared-secret
// bearer token — each route verifies that (or a signed-in, authorized
// user) independently, so the proxy just needs to not reject it purely
// for lacking a session cookie.
const CRON_PATHS = [
  "/api/social-posts/sync",
  "/api/jtf-assessments/purge",
  "/api/intel-updates/overall-assessment/purge",
];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Manifest icons must be fetchable without a session — browsers and the
  // Android TWA/APK tooling read them unauthenticated to validate the PWA.
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/.well-known/")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (CRON_PATHS.includes(pathname)) {
      return NextResponse.next();
    }
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (await isDeviceKicked(req.auth)) {
      return clearSessionCookies(
        NextResponse.json({ error: "This device's access has been revoked" }, { status: 401 })
      );
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (await isDeviceKicked(req.auth)) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("error", "device_kicked");
    return clearSessionCookies(NextResponse.redirect(loginUrl));
  }

  return NextResponse.next();
});

// How stale `lastSeenAt` has to be before this request bothers refreshing
// it — caps the write to roughly once per device per window instead of once
// per request, since this fires on nearly every authenticated page load.
// The "online" figure on User Management treats anything newer than this
// (plus a little slack) as active.
const ACTIVITY_TOUCH_THROTTLE_MS = 2 * 60 * 1000;

/** Only new-style sessions carry a deviceId (see auth.ts) — a session from
 * before this feature shipped has none and is never checked or kickable.
 * Also opportunistically refreshes `lastSeenAt` so it reflects live usage,
 * not just the last time this device submitted credentials — otherwise
 * every device would look stale within moments of signing in. */
async function isDeviceKicked(session: { user: { deviceId: string | null } } | null): Promise<boolean> {
  const deviceId = session?.user.deviceId;
  if (!deviceId) return false;
  const device = await prisma.userDevice.findUnique({
    where: { id: deviceId },
    select: { status: true, lastSeenAt: true },
  });
  if (!device) return false;
  if (Date.now() - device.lastSeenAt.getTime() > ACTIVITY_TOUCH_THROTTLE_MS) {
    await prisma.userDevice.update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } });
  }
  return device.status === "KICKED";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

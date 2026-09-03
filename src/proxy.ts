import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/manifest.webmanifest"];

export default auth((req) => {
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
    // Vercel Cron triggers this hourly with no browser session, only a
    // shared-secret bearer token — the route itself verifies that (or a
    // signed-in, authorized user) independently, so the proxy just needs
    // to not reject it purely for lacking a session cookie.
    if (pathname === "/api/social-posts/sync") {
      return NextResponse.next();
    }
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

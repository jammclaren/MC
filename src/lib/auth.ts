import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role, WarfightingFunction } from "@/generated/prisma/client";
import { extractRequestMeta, hashDeviceFingerprint, parseDeviceInfo } from "@/lib/device";
import { notifyAdminsOfNewDevice } from "@/lib/notify-device-login";

declare module "next-auth" {
  interface User {
    role: Role;
    jtfId: string | null;
    warfightingFunction: WarfightingFunction | null;
    deviceId: string | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      jtfId: string | null;
      warfightingFunction: WarfightingFunction | null;
      deviceId: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    jtfId: string | null;
    warfightingFunction: WarfightingFunction | null;
    deviceId: string | null;
  }
}

/** Thrown by authorize() when the credentials are correct but this specific
 * device was kicked by an Admin — surfaced on the login page as a distinct
 * message rather than a generic "invalid credentials". */
class DeviceKickedError extends CredentialsSignin {
  code = "device_kicked";
}

/** Thrown when a NEW device tries to log into an account that has already
 * reached its admin-set `maxDevices` cap. Devices already on file keep
 * working even if the cap is lowered later — this only blocks adding
 * another one past the limit. */
class DeviceLimitReachedError extends CredentialsSignin {
  code = "device_limit_reached";
}

/**
 * Finds or creates the UserDevice row for this login's (user, browser)
 * fingerprint. Existing sessions from before this feature shipped never
 * call this — they simply have no deviceId, and are exempt from the whole
 * device-review/kick system (see proxy.ts).
 */
async function resolveLoginDevice(
  user: { id: string; name: string; email: string; maxDevices: number | null },
  request: Request
): Promise<string> {
  const { userAgent, ipAddress, location } = extractRequestMeta(request);
  const fingerprint = hashDeviceFingerprint(user.id, userAgent, ipAddress);

  const existing = await prisma.userDevice.findUnique({
    where: { userId_fingerprint: { userId: user.id, fingerprint } },
  });

  if (existing) {
    if (existing.status === "KICKED") {
      throw new DeviceKickedError();
    }
    await prisma.userDevice.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), ipAddress, location },
    });
    return existing.id;
  }

  if (user.maxDevices != null) {
    const activeDeviceCount = await prisma.userDevice.count({
      where: { userId: user.id, status: { not: "KICKED" } },
    });
    if (activeDeviceCount >= user.maxDevices) {
      throw new DeviceLimitReachedError();
    }
  }

  const { deviceLabel, deviceType } = parseDeviceInfo(userAgent);
  const created = await prisma.userDevice.create({
    data: { userId: user.id, fingerprint, deviceLabel, deviceType, userAgent, ipAddress, location, notifiedAt: new Date() },
  });

  // Fire-and-forget: a notification failure must never block this login.
  void notifyAdminsOfNewDevice({
    userName: user.name,
    userEmail: user.email,
    deviceLabel,
    deviceType,
    location,
    ipAddress,
  });

  return created.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        const deviceId = await resolveLoginDevice(user, request);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          jtfId: user.jtfId,
          warfightingFunction: user.warfightingFunction,
          deviceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // authorize() above always returns a concrete id; the base NextAuth
        // User type just declares it optional for other provider types.
        token.id = user.id as string;
        token.role = user.role;
        token.jtfId = user.jtfId;
        token.warfightingFunction = user.warfightingFunction;
        token.deviceId = user.deviceId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.jtfId = token.jtfId;
      session.user.warfightingFunction = token.warfightingFunction;
      session.user.deviceId = token.deviceId ?? null;
      return session;
    },
  },
});

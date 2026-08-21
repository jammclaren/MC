import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/rbac";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    jtfId: session.user.jtfId,
  };
}

/** Throws if unauthenticated. Proxy already blocks unauthenticated API access,
 * but route handlers must not rely on that alone (see Next.js proxy docs). */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

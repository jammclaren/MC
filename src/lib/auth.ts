import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role, WarfightingFunction } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    jtfId: string | null;
    warfightingFunction: WarfightingFunction | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      jtfId: string | null;
      warfightingFunction: WarfightingFunction | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    jtfId: string | null;
    warfightingFunction: WarfightingFunction | null;
  }
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
      async authorize(credentials) {
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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          jtfId: user.jtfId,
          warfightingFunction: user.warfightingFunction,
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
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.jtfId = token.jtfId;
      session.user.warfightingFunction = token.warfightingFunction;
      return session;
    },
  },
});

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      email: string;
      emailVerifiedAt: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    emailVerifiedAt?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as { uid?: string }).uid = user.id as string;
        (token as { role?: Role }).role = (user as { role: Role }).role;
        (token as { emailVerifiedAt?: string | null }).emailVerifiedAt =
          (user as { emailVerifiedAt?: string | null }).emailVerifiedAt ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as {
        uid?: string;
        role?: Role;
        emailVerifiedAt?: string | null;
      };
      if (t.uid) {
        session.user.id = t.uid;
        session.user.role = t.role ?? "UNSET";
        session.user.emailVerifiedAt = t.emailVerifiedAt ?? null;
      }
      return session;
    },
  },
});

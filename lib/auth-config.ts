import type { DefaultSession, NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/types";

export const FOUNDER_PASSCODE_PROVIDER = "founder-passcode";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      email: string;
      emailVerifiedAt: string | null;
      founderPasscode: boolean;
      founderIssuedAt?: number;
    } & DefaultSession["user"];
  }
  interface User {
    sessionVersion: number;
    founderSessionId?: string;
    role: Role;
    emailVerifiedAt?: string | null;
  }
}

type SessionClaims = {
  uid?: string;
  role?: Role;
  emailVerifiedAt?: string | null;
  founderPasscode?: boolean;
};

// Shared with Edge middleware. Credential checks run only on the server.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.sessionVersion = user.sessionVersion;
        token.founderSessionId = user.founderSessionId;
        token.uid = user.id;
        token.role = user.role;
        token.emailVerifiedAt = user.emailVerifiedAt ?? null;
        token.founderPasscode = account?.provider === FOUNDER_PASSCODE_PROVIDER;
      }
      return token;
    },
    async session({ session, token }) {
      const claims = token as SessionClaims;
      if (claims.uid) {
        session.user.founderIssuedAt = typeof token.founderIssuedAt === "number" ? token.founderIssuedAt : undefined;
        session.user.id = claims.uid;
        session.user.role = claims.role ?? "UNSET";
        session.user.emailVerifiedAt = claims.emailVerifiedAt ?? null;
        session.user.founderPasscode = claims.founderPasscode === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

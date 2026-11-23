import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig, FOUNDER_PASSCODE_PROVIDER } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { isFounderEmail } from "@/lib/founder-identity";
import { consumeFounderPasscode } from "@/lib/founder-passcode";
import type { Role } from "@/lib/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password || isFounderEmail(email)) return null;
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
    Credentials({
      id: FOUNDER_PASSCODE_PROVIDER,
      name: "Founder email passcode",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Passcode", type: "text" },
      },
      async authorize(creds) {
        return consumeFounderPasscode(creds?.email, creds?.code);
      },
    }),
  ],
});

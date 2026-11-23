import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth-config";
import { isFounderEmail, isFounderSession } from "@/lib/founder-identity";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth?.user;
  const email = req.auth?.user?.email;
  const path = nextUrl.pathname;

  const isPublic =
    path === "/" ||
    path === "/login" ||
    path === "/login/founder" ||
    path === "/signup" ||
    path === "/verify-email" ||
    path.startsWith("/verify-email/") ||
    path === "/terms" ||
    path === "/privacy" ||
    path === "/rules" ||
    path === "/support" ||
    path === "/support/thanks" ||
    path === "/early-access" ||
    path === "/early-access/thanks" ||
    path === "/forgot" ||
    path === "/forgot/sent" ||
    path.startsWith("/reset/") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/brand/") ||
    path === "/icon.png" ||
    path.startsWith("/icon") ||
    path === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  if (path === "/founder" || path.startsWith("/founder/")) {
    if (isFounderSession(req.auth?.user)) return NextResponse.next();
    if (isAuthed && !isFounderEmail(email)) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    const url = new URL("/login/founder", nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (!isAuthed) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // The Node guards resolve current verification, pilot access and role from the database.
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth(?:/|$)|_next/static|_next/image|favicon.ico).*)"],
};

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth-config";
import { isFounderEmail, isFounderSession } from "@/lib/founder-identity";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth?.user;
  const role = req.auth?.user?.role;
  const email = req.auth?.user?.email;
  const emailVerifiedAt = req.auth?.user?.emailVerifiedAt;
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

  if (!emailVerifiedAt) {
    const allowedWhileUnverified =
      path === "/settings" ||
      path === "/support" ||
      path === "/support/thanks" ||
      path === "/notifications" ||
      path.startsWith("/api/auth");
    if (!allowedWhileUnverified) {
      return NextResponse.redirect(new URL("/verify-email", nextUrl));
    }
  }

  if (path.startsWith("/manager") && role !== "MANAGER") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }
  if (path.startsWith("/marshal") && role !== "MARSHAL") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

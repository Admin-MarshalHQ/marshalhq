import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isFounderEmail } from "@/lib/access";

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth?.user;
  const role = req.auth?.user?.role;
  const email = req.auth?.user?.email;
  const path = nextUrl.pathname;

  const isPublic =
    path === "/" ||
    path === "/login" ||
    path === "/signup" ||
    path === "/terms" ||
    path === "/privacy" ||
    path === "/rules" ||
    path === "/support" ||
    path === "/support/thanks" ||
    path === "/forgot" ||
    path === "/forgot/sent" ||
    path.startsWith("/reset/") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  if (!isAuthed) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Founder panel is gated by FOUNDER_EMAILS (not a role). Non-founders are
  // bounced to the home page rather than given a chance to enumerate the area.
  if (path.startsWith("/founder")) {
    if (!isFounderEmail(email)) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
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

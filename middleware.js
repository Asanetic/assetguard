// middleware.js  (project root, sibling of app/)
// Lightweight gate: bounces users with no session cookie away from the admin
// area. Full role verification happens in the API routes (requireAdmin).
import { NextResponse } from "next/server";

const AUTH_COOKIE = "atc_token";

export function middleware(request) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/mainapp/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect the admin section (extend this matcher as the app grows).
  matcher: ["/mainapp/admin/:path*"],
};

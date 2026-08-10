// middleware.js  (project root, sibling of app/)
// -----------------------------------------------------------------------------
// Session gate for the whole app:
//   - No session cookie  -> allow only the public auth pages; bounce the rest
//                           of /mainapp to the login screen.
//   - Has a session      -> keep the user out of login/register (send to app).
// Full role verification still happens in the API routes (requireAdmin).
// -----------------------------------------------------------------------------
import { NextResponse } from "next/server";

const AUTH_COOKIE = "atc_token";

// Pages reachable without a session (the auth flow).
const PUBLIC = [
  "/mainapp/login",
  "/mainapp/register",
  "/mainapp/forgot-password",
  "/mainapp/status",
  "/mainapp/request-access",
  "/mainapp/registration-rejected",
];

function isPublic(pathname) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  // Signed out: allow the auth pages, redirect everything else to login.
  if (!token) {
    if (isPublic(pathname)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/mainapp/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Signed in: don't let them sit on login/register — send them into the app.
  if (pathname === "/mainapp/login" || pathname === "/mainapp/register") {
    const url = request.nextUrl.clone();
    url.pathname = "/mainapp";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Guard the whole app area (both /mainapp and everything beneath it).
  matcher: ["/mainapp", "/mainapp/:path*"],
};

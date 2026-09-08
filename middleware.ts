import { NextRequest, NextResponse } from "next/server";
import { dashboardForRole, SESSION_COOKIE, verifySession, UserRole } from "@/lib/auth";

const ROLE_PREFIXES: Array<[string, UserRole]> = [
  ["/patient/", "patient"],
  ["/specialist/", "specialist"],
  ["/hospital/", "hospital"],
  ["/insurance/", "insurance_agent"],
  ["/admin/", "admin"],
];

function requiredRole(pathname: string) {
  return ROLE_PREFIXES.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // SNS Workbench authenticates independently with the webhook secret/HMAC.
  if (pathname === "/api/webhooks/sns") return NextResponse.next();

  // Public authentication endpoints and the login page must remain reachable.
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = requiredRole(pathname);
  if (role && session.role !== role) {
    return NextResponse.redirect(new URL(dashboardForRole(session.role), req.url));
  }

  // Legacy patient-only namespaces are protected at the edge as well.
  const patientOnly =
    pathname.startsWith("/requests") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/appointments");

  if (patientOnly && session.role !== "patient") {
    return NextResponse.redirect(new URL(dashboardForRole(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patient/:path*",
    "/hospital/:path*",
    "/insurance/:path*",
    "/specialist/:path*",
    "/admin/:path*",
    "/requests/:path*",
    "/documents/:path*",
    "/appointments/:path*",
    "/api/:path*",
  ],
};

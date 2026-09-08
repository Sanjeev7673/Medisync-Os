import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/api/webhooks/sns") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    if (pathname.startsWith("/api/auth/") || pathname === "/login") return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/patient/") && session.role !== "patient") return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname.startsWith("/hospital/") && session.role !== "hospital") return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname.startsWith("/insurance/") && session.role !== "insurance_agent") return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname.startsWith("/specialist/") && session.role !== "specialist") return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname.startsWith("/admin/") && session.role !== "admin") return NextResponse.redirect(new URL("/dashboard", req.url));

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

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // SNS Agent Workbench calls this webhook directly and authenticates with
  // its dedicated shared secret in the route handler.
  if (pathname === "/api/webhooks/sns") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/auth/") || pathname === "/login") return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("returnTo", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/requests/:path*", "/documents/:path*", "/appointments/:path*", "/api/:path*"],
};

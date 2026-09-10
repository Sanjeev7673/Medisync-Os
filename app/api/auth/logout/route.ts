import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

function clearSession(req: Request) {
  const response = NextResponse.redirect(new URL("/login", req.url));
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}

// Never mutate authentication state on GET. Next.js may prefetch GET links,
// which previously caused users to be logged out simply by opening a page.
export async function GET(req: Request) {
  return NextResponse.json({ error: "Use POST to sign out." }, { status: 405 });
}

export async function POST(req: Request) {
  return clearSession(req);
}

import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function GET(req: Request) {
  const response = NextResponse.redirect(
    new URL("/login", req.url),
  );

  response.cookies.set(
    SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  );

  return response;
}

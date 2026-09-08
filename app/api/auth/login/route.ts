import { NextRequest, NextResponse } from "next/server";
import { cognitoConfig, randomState, ROLE_HINT_COOKIE, STATE_COOKIE, UserRole } from "@/lib/auth";

const selectableRoles: UserRole[] = ["patient", "hospital", "insurance_agent"];

export async function GET(req: NextRequest) {
  const config = cognitoConfig();
  const requestedRole = req.nextUrl.searchParams.get("role") as UserRole | null;
  const role = requestedRole && selectableRoles.includes(requestedRole) ? requestedRole : "patient";
  const state = randomState();
  const url = new URL(`${config.domain}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "login");

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  response.cookies.set(ROLE_HINT_COOKIE, role, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}

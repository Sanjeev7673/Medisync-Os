import { NextResponse } from "next/server";
import { cognitoConfig, randomState, STATE_COOKIE } from "@/lib/auth";

export async function GET() {
  const config = cognitoConfig();
  const state = randomState();
  const url = new URL(`${config.domain}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}

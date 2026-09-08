import { NextResponse } from "next/server";
import { cognitoConfig, randomState, STATE_COOKIE } from "@/lib/auth";

export async function GET() {
  const config = cognitoConfig();
  const state = randomState();
  const url = new URL(`${config.domain}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  // Do not silently reuse an existing Cognito browser session when the user
  // explicitly chooses Sign in. This makes the authentication step visible.
  url.searchParams.set("prompt", "login");

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

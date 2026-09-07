import { NextResponse } from "next/server";
import { cognitoConfig, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  const config = cognitoConfig();
  const url = new URL(`${config.domain}/logout`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("logout_uri", `${config.appUrl}/login`);

  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

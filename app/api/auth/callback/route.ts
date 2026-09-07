import { NextRequest, NextResponse } from "next/server";
import { base64UrlJson, cognitoConfig, createSession, SESSION_COOKIE, STATE_COOKIE } from "@/lib/auth";

type JwtHeader = { kid: string; alg: string };
type JwtClaims = {
  sub: string;
  email?: string;
  token_use?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  "custom:patient_id"?: string;
  "custom:role"?: string;
  "cognito:groups"?: string[];
};

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===";
  const binary = atob(padded.slice(0, padded.length - (padded.length % 4)));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifyCognitoIdToken(token: string, config: ReturnType<typeof cognitoConfig>) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Cognito ID token");

  const header = base64UrlJson(parts[0]) as unknown as JwtHeader;
  const claims = base64UrlJson(parts[1]) as unknown as JwtClaims;
  if (!header.kid || header.alg !== "RS256") throw new Error("Unsupported Cognito token signing algorithm");

  const jwksResponse = await fetch(`${config.issuer}/.well-known/jwks.json`, { cache: "no-store" });
  if (!jwksResponse.ok) throw new Error("Unable to load Cognito signing keys");
  const jwks = (await jwksResponse.json()) as { keys: JsonWebKey[] };
  const jwk = jwks.keys.find((key) => (key as JsonWebKey & { kid?: string }).kid === header.kid);
  if (!jwk) throw new Error("Cognito signing key not found");

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );

  const now = Math.floor(Date.now() / 1000);
  if (!valid || claims.token_use !== "id" || claims.iss !== config.issuer || claims.aud !== config.clientId || !claims.exp || claims.exp <= now) {
    throw new Error("Invalid Cognito ID token claims");
  }
  return claims;
}

function roleFromClaims(claims: JwtClaims): "patient" | "specialist" | "admin" | "hospital" {
  const role = claims["custom:role"];
  if (role === "specialist" || role === "admin" || role === "hospital") return role;
  const groups = claims["cognito:groups"] ?? [];
  if (groups.includes("admin")) return "admin";
  if (groups.includes("specialist")) return "specialist";
  if (groups.includes("hospital")) return "hospital";
  return "patient";
}

export async function GET(req: NextRequest) {
  try {
    const config = cognitoConfig();
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const expectedState = req.cookies.get(STATE_COOKIE)?.value;
    if (!code || !state || !expectedState || state !== expectedState) {
      return NextResponse.redirect(new URL("/login?error=oauth_state", config.appUrl));
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    });
    const tokenResponse = await fetch(`${config.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!tokenResponse.ok) {
      console.error("Cognito token exchange failed", await tokenResponse.text());
      return NextResponse.redirect(new URL("/login?error=oauth_token", config.appUrl));
    }

    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokens.id_token) throw new Error("Cognito did not return an ID token");
    const claims = await verifyCognitoIdToken(tokens.id_token, config);
    const session = await createSession({
      sub: claims.sub,
      email: claims.email,
      role: roleFromClaims(claims),
      patientId: claims["custom:patient_id"],
    });

    const response = NextResponse.redirect(new URL("/dashboard", config.appUrl));
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Cognito callback failed", error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://medisync-os.vercel.app";
    return NextResponse.redirect(new URL("/login?error=oauth_callback", appUrl));
  }
}

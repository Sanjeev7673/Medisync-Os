import { NextRequest } from "next/server";

export const SESSION_COOKIE = "medisync_session";
export const STATE_COOKIE = "medisync_oauth_state";
export const ROLE_HINT_COOKIE = "medisync_role_hint";

export type UserRole = "patient" | "hospital" | "insurance_agent" | "specialist" | "admin";

type Session = {
  sub: string;
  email?: string;
  name?: string;
  role: UserRole;
  patientId?: string;
  hospitalId?: string;
  insuranceAgentId?: string;
  exp: number;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===";
  const binary = atob(padded.slice(0, padded.length - (padded.length % 4)));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(required("MEDISYNC_SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return key;
}

export async function createSession(input: Omit<Session, "exp">) {
  const payload: Session = { ...input, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmac(encoded), new TextEncoder().encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmac(encoded),
      fromBase64Url(signature),
      new TextEncoder().encode(encoded),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as Session;
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest) {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

export function cognitoConfig() {
  const domain = required("COGNITO_DOMAIN").replace(/\/$/, "");
  const appUrl = required("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
  return {
    domain,
    appUrl,
    clientId: required("COGNITO_CLIENT_ID"),
    clientSecret: required("COGNITO_CLIENT_SECRET"),
    issuer: domain,
    callbackUrl: `${appUrl}/api/auth/callback`,
  };
}

export function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function base64UrlJson(value: string) {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(value))) as Record<string, unknown>;
}

import { NextRequest } from "next/server";

export const SESSION_COOKIE = "medisync_session";
export const SESSION_MAX_AGE = 60 * 60 * 8;

export type UserRole = "patient" | "hospital" | "insurance_agent" | "specialist" | "admin";

export type Session = {
  sub: string;
  email?: string;
  name?: string;
  role: UserRole;
  organizationId?: string;
  patientId?: string;
  hospitalId?: string;
  insuranceAgentId?: string;
  exp: number;
  iat: number;
};

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  patient: "/patient/dashboard",
  specialist: "/specialist/dashboard",
  hospital: "/hospital/dashboard",
  insurance_agent: "/insurance/dashboard",
  admin: "/admin/dashboard",
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

async function deriveAesKey(usage: KeyUsage[]) {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${required("MEDISYNC_SESSION_SECRET")}:encrypt`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, usage);
}

async function getSigningKey() {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${required("MEDISYNC_SESSION_SECRET")}:sign`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function encrypt(payload: Session) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await deriveAesKey(["encrypt"]),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

async function decrypt(token: string) {
  const [ivPart, ciphertextPart] = token.split(".");
  if (!ivPart || !ciphertextPart) return null;
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(ivPart) },
    await deriveAesKey(["decrypt"]),
    fromBase64Url(ciphertextPart),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as Session;
}

export async function createSession(input: Omit<Session, "exp" | "iat">) {
  const now = Math.floor(Date.now() / 1000);
  const payload: Session = { ...input, iat: now, exp: now + SESSION_MAX_AGE };
  const encrypted = await encrypt(payload);
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), new TextEncoder().encode(encrypted));
  return `${encrypted}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const encrypted = `${parts[0]}.${parts[1]}`;
  try {
    const valid = await crypto.subtle.verify("HMAC", await getSigningKey(), fromBase64Url(parts[2]), new TextEncoder().encode(encrypted));
    if (!valid) return null;
    const payload = await decrypt(encrypted);
    if (!payload?.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest) {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

export function dashboardForRole(role: UserRole) {
  return ROLE_DASHBOARDS[role];
}

export function hasRole(session: Session | null, allowedRoles: readonly UserRole[]) {
  return !!session && allowedRoles.includes(session.role);
}

export async function requireRole(req: NextRequest, allowedRoles: readonly UserRole[]) {
  const session = await getSessionFromRequest(req);
  if (!session) return { ok: false as const, status: 401, error: "Authentication required" };
  if (!hasRole(session, allowedRoles)) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, session };
}

export function verifyResourceOwnership(session: Session, resourceOwnerId: string) {
  if (session.role === "admin" || session.role === "specialist") return true;
  if (session.role === "patient") return session.patientId === resourceOwnerId;
  if (session.role === "hospital") return session.hospitalId === resourceOwnerId;
  if (session.role === "insurance_agent") return session.insuranceAgentId === resourceOwnerId;
  return false;
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge: SESSION_MAX_AGE };
}

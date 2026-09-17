import { createHash, createHmac, randomBytes } from "node:crypto";

export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export type GoogleOAuthRole = "patient" | "hospital" | "insurance_agent" | "admin";
export type GoogleOAuthMode = "signin" | "signup";

export type GoogleOAuthState = {
  role: GoogleOAuthRole;
  mode: GoogleOAuthMode;
  details?: Record<string, string>;
  exp: number;
  nonce: string;
};

function secret() {
  const value = process.env.MEDISYNC_SESSION_SECRET;
  if (!value) throw new Error("Missing environment variable: MEDISYNC_SESSION_SECRET");
  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createGoogleOAuthState(input: Omit<GoogleOAuthState, "exp" | "nonce">) {
  const state: GoogleOAuthState = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + GOOGLE_OAUTH_STATE_TTL_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  };
  const payload = encode(JSON.stringify(state));
  return `${payload}.${sign(payload)}`;
}

export function verifyGoogleOAuthState(value: string): GoogleOAuthState | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!createHash("sha256").update(signature).digest("hex").localeCompare(createHash("sha256").update(expected).digest("hex"))) return null;
  try {
    const state = JSON.parse(decode(payload)) as GoogleOAuthState;
    if (!state || !state.exp || state.exp < Math.floor(Date.now() / 1000)) return null;
    if (!['patient', 'hospital', 'insurance_agent', 'admin'].includes(state.role)) return null;
    if (!['signin', 'signup'].includes(state.mode)) return null;
    return state;
  } catch {
    return null;
  }
}

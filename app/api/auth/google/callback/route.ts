import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { createSession, dashboardForRole, sessionCookieOptions, SESSION_COOKIE, UserRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyGoogleOAuthState, GoogleOAuthRole } from "@/lib/google-auth";

const ROLE_MAP: Record<GoogleOAuthRole, "PATIENT" | "HOSPITAL" | "INSURANCE" | "ADMIN"> = {
  patient: "PATIENT",
  hospital: "HOSPITAL",
  insurance_agent: "INSURANCE",
  admin: "ADMIN",
};

const SESSION_ROLES: Record<GoogleOAuthRole, UserRole> = {
  patient: "patient",
  hospital: "hospital",
  insurance_agent: "insurance_agent",
  admin: "admin",
};

const ROLE_LOGIN_PATH: Record<GoogleOAuthRole, string> = {
  patient: "/patient/login",
  hospital: "/hospital/login",
  insurance_agent: "/insurance/login",
  admin: "/admin/login",
};

function required(name: "SUPABASE_URL" | "SUPABASE_SECRET_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function redirectError(req: NextRequest, role: GoogleOAuthRole, message: string) {
  const url = new URL(ROLE_LOGIN_PATH[role], new URL(req.url).origin);
  url.searchParams.set("googleError", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const stateValue = requestUrl.searchParams.get("state") || "";
  const state = verifyGoogleOAuthState(stateValue);

  if (!state) return NextResponse.redirect(new URL("/signin?googleError=Invalid%20or%20expired%20Google%20authentication%20request.", requestUrl.origin));
  if (!code) return redirectError(req, state.role, "Google authentication was cancelled or did not return a code.");

  try {
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) throw new Error(error?.message || "Google user session was not returned");

    const googleUser = data.user;
    const email = googleUser.email?.trim().toLowerCase();
    if (!email) return redirectError(req, state.role, "Google did not provide an email address for this account.");

    const db = getDb();
    let { data: user, error: userError } = await db
      .from("users")
      .select("id,medisync_id,email,name,role,organization_id,status,session_version,profile_details")
      .eq("email", email)
      .maybeSingle<any>();
    if (userError) throw userError;

    if (state.mode === "signin") {
      if (!user) return redirectError(req, state.role, "No MediSync account was found for this Google email. Please use Sign up first.");
      if (user.role !== ROLE_MAP[state.role]) return redirectError(req, state.role, "This Google account belongs to a different MediSync portal.");
      if (user.status !== "ACTIVE") return redirectError(req, state.role, "This MediSync account is not active.");
    } else {
      if (user) return redirectError(req, state.role, "A MediSync account already exists for this Google email. Please sign in instead.");

      const details = state.details || {};
      const fallbackName = typeof googleUser.user_metadata?.full_name === "string" ? googleUser.user_metadata.full_name.trim() : "";
      const name = details.name?.trim() || details.hospitalName?.trim() || details.agencyName?.trim() || fallbackName || email.split("@")[0];
      const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      const { data: created, error: createError } = await db
        .from("users")
        .insert({ email, password_hash: passwordHash, name, role: ROLE_MAP[state.role], status: "ACTIVE", profile_details: details })
        .select("id,medisync_id,email,name,role,organization_id,status,session_version")
        .single<any>();
      if (createError) {
        if (createError.code === "23505") return redirectError(req, state.role, "A MediSync account already exists for this Google email. Please sign in instead.");
        throw createError;
      }
      user = created;
    }

    const role = SESSION_ROLES[state.role];
    const session = await createSession({
      sub: user.id,
      medisyncId: user.medisync_id,
      email: user.email,
      name: user.name,
      role,
      organizationId: user.organization_id ?? undefined,
      patientId: role === "patient" ? user.id : undefined,
      hospitalId: role === "hospital" ? user.organization_id ?? undefined : undefined,
      insuranceAgentId: role === "insurance_agent" ? user.organization_id ?? undefined : undefined,
    });

    const response = NextResponse.redirect(new URL(dashboardForRole(role), requestUrl.origin));
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Google OAuth callback failure:", error instanceof Error ? error.message : "Unknown error");
    return redirectError(req, state.role, "Google authentication could not be completed. Please try again.");
  }
}

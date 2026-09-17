import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleOAuthState, GoogleOAuthMode, GoogleOAuthRole } from "@/lib/google-auth";

const ROLES: GoogleOAuthRole[] = ["patient", "hospital", "insurance_agent", "admin"];
const MODES: GoogleOAuthMode[] = ["signin", "signup"];

function required(name: "SUPABASE_URL" | "SUPABASE_SECRET_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const roleValue = typeof body?.role === "string" ? body.role : "";
    const modeValue = typeof body?.mode === "string" ? body.mode : "";
    const details = body?.details && typeof body.details === "object" ? body.details as Record<string, string> : undefined;

    if (!ROLES.includes(roleValue as GoogleOAuthRole) || !MODES.includes(modeValue as GoogleOAuthMode)) {
      return NextResponse.json({ error: "Invalid Google authentication request." }, { status: 400 });
    }

    const role = roleValue as GoogleOAuthRole;
    const mode = modeValue as GoogleOAuthMode;

    if (mode === "signup") {
      const requiredFields: Record<GoogleOAuthRole, string[]> = {
        patient: ["name", "dob", "phone"],
        hospital: ["hospitalName", "registrationId"],
        insurance_agent: ["agencyName", "agencyId"],
        admin: ["name", "adminId"],
      };
      const missing = requiredFields[role].some((key) => !details?.[key]?.trim());
      if (missing) return NextResponse.json({ error: "Complete the role details before continuing with Google." }, { status: 400 });
    }

    const state = createGoogleOAuthState({
      role,
      mode,
      details: mode === "signup" ? details : undefined,
    });

    const origin = new URL(req.url).origin;
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/google/callback?state=${encodeURIComponent(state)}`,
      },
    });

    if (error || !data.url) {
      console.error("Google OAuth start failure:", error?.message || "Missing OAuth URL");
      return NextResponse.json({ error: "Google authentication is not configured yet." }, { status: 503 });
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("Google OAuth start failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Google authentication is temporarily unavailable." }, { status: 503 });
  }
}

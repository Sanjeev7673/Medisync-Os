import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createSession,
  dashboardForRole,
  sessionCookieOptions,
  SESSION_COOKIE,
  UserRole,
} from "@/lib/auth";
import { DbUser, getDb } from "@/lib/db";

const roleMap: Record<DbUser["role"], UserRole> = {
  PATIENT: "patient",
  SPECIALIST: "specialist",
  HOSPITAL: "hospital",
  INSURANCE: "insurance_agent",
  ADMIN: "admin",
};

const loginRoleLabels: Record<Exclude<UserRole, "specialist">, string> = {
  patient: "patient",
  hospital: "hospital",
  insurance_agent: "insurance agency",
  admin: "administrator",
};

function required(name: "SUPABASE_URL" | "SUPABASE_SECRET_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const expectedRole = typeof body?.expectedRole === "string"
      ? (body.expectedRole === "insurance" ? "insurance_agent" : body.expectedRole) as UserRole
      : undefined;

    if (!email || !password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (expectedRole && !Object.keys(loginRoleLabels).includes(expectedRole)) {
      return NextResponse.json({ error: "Invalid portal" }, { status: 400 });
    }

    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const db = getDb();
    let { data: user, error: userError } = await db
      .from("users")
      .select("id,medisync_id,email,password_hash,name,role,organization_id,status,session_version,created_at,updated_at")
      .eq("email", email)
      .maybeSingle<DbUser>();

    if (userError) throw userError;

    if (!user) {
      return NextResponse.json({
        error: "Your Supabase account is authenticated, but no MediSync profile exists for this email. Create the MediSync profile first."
      }, { status: 403 });
    }

    // Supabase Auth is now the source of truth for the password. Once it
    // successfully authenticates an existing MediSync profile, make that
    // profile active so a newly-created Supabase user can enter the portal.
    if (user.status !== "ACTIVE") {
      const { data: activatedUser, error: activateError } = await db
        .from("users")
        .update({ status: "ACTIVE" })
        .eq("id", user.id)
        .select("id,medisync_id,email,password_hash,name,role,organization_id,status,session_version,created_at,updated_at")
        .single<DbUser>();

      if (activateError) throw activateError;
      user = activatedUser;
    }

    const role = roleMap[user.role];

    if (expectedRole && role !== expectedRole) {
      const expectedLabel = loginRoleLabels[expectedRole as Exclude<UserRole, "specialist">];
      return NextResponse.json({ error: `This account is not assigned to the ${expectedLabel} portal.` }, { status: 403 });
    }

    const session = await createSession({
      sub: user.id,
      medisyncId: user.medisync_id,
      email: user.email,
      name: user.name,
      role,
      patientId: role === "patient" ? user.id : undefined,
      hospitalId: role === "hospital" ? user.organization_id ?? undefined : undefined,
      insuranceAgentId: role === "insurance_agent" ? user.organization_id ?? undefined : undefined,
      organizationId: user.organization_id ?? undefined,
    });

    const response = NextResponse.json({
      authenticated: true,
      user: { id: user.id, medisyncId: user.medisync_id, email: user.email, name: user.name, role },
      redirectTo: dashboardForRole(role),
    });

    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("MediSync Supabase login failure:", error instanceof Error ? error.message : "Unknown authentication error");
    return NextResponse.json({ error: "Authentication service is temporarily unavailable. Please try again.", code: "AUTH_SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}

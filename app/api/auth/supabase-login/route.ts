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

const dbRoleMap: Record<Exclude<UserRole, "specialist">, DbUser["role"]> = {
  patient: "PATIENT",
  hospital: "HOSPITAL",
  insurance_agent: "INSURANCE",
  admin: "ADMIN",
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

const userSelect = "id,medisync_id,email,name,role,organization_id,status,session_version,created_at,updated_at";

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

    // Supabase Auth is the only source of truth for email/password credentials.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const db = getDb();
    let { data: user, error: userError } = await db
      .from("users")
      .select(userSelect)
      .eq("email", email)
      .maybeSingle<DbUser>();

    if (userError) throw userError;

    // A user created directly in Supabase Auth gets a lightweight MediSync
    // profile on first login. No password is copied into public.users.
    if (!user) {
      if (!expectedRole || expectedRole === "specialist") {
        return NextResponse.json({ error: "Please select a valid MediSync portal before signing in." }, { status: 400 });
      }

      const metadataName = [
        authData.user.user_metadata?.full_name,
        authData.user.user_metadata?.name,
      ].find((value) => typeof value === "string" && value.trim());
      const name = metadataName?.trim() || email.split("@")[0] || "MediSync User";

      const { data: createdUser, error: createError } = await db
        .from("users")
        .insert({
          email,
          name,
          role: dbRoleMap[expectedRole],
          status: "ACTIVE",
        })
        .select(userSelect)
        .single<DbUser>();

      if (createError) {
        if (createError.code !== "23505") throw createError;
        const { data: existingUser, error: retryError } = await db
          .from("users")
          .select(userSelect)
          .eq("email", email)
          .maybeSingle<DbUser>();
        if (retryError) throw retryError;
        user = existingUser;
      } else {
        user = createdUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "MediSync profile could not be created." }, { status: 500 });
    }

    if (user.status !== "ACTIVE") {
      const { data: activatedUser, error: activateError } = await db
        .from("users")
        .update({ status: "ACTIVE" })
        .eq("id", user.id)
        .select(userSelect)
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

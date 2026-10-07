import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

const userSelect = "id,medisync_id,email,name,password_hash,role,organization_id,status,session_version,created_at,updated_at";

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

    const db = getDb();
    let { data: user, error: userError } = await db
      .from("users")
      .select(userSelect)
      .eq("email", email)
      .eq("role", expectedRole ? dbRoleMap[expectedRole as Exclude<UserRole, "specialist">] : "PATIENT")
      .maybeSingle<DbUser & { password_hash?: string | null }>();

    if (userError) throw userError;

    // Registration stores the bcrypt hash in public.users. Authenticate against
    // the same source of truth instead of requiring a second Supabase Auth account.
    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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

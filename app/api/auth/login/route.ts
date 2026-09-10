import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, dashboardForRole, sessionCookieOptions, SESSION_COOKIE, UserRole } from "@/lib/auth";
import { DbUser, getDb } from "@/lib/db";

const roleMap: Record<DbUser["role"], UserRole> = {
  PATIENT: "patient",
  SPECIALIST: "specialist",
  HOSPITAL: "hospital",
  INSURANCE: "insurance_agent",
  ADMIN: "admin",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const { data: user, error } = await getDb()
      .from("users")
      .select("id,email,password_hash,name,role,organization_id,status,created_at,updated_at")
      .eq("email", email)
      .maybeSingle<DbUser>();

    if (error) throw error;

    const passwordValid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !passwordValid || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const role = roleMap[user.role];
    const session = await createSession({
      sub: user.id,
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
      user: { id: user.id, email: user.email, name: user.name, role },
      redirectTo: dashboardForRole(role),
    });
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("MediSync login failure:", error instanceof Error ? error.message : "Unknown authentication error");
    return NextResponse.json({ error: "Authentication service is temporarily unavailable. Please try again.", code: "AUTH_SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}

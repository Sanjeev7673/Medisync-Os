import { NextRequest, NextResponse } from "next/server";
import { createSession, dashboardForRole, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashOtp, OTP_MAX_ATTEMPTS } from "@/lib/registration-otp";

const OTP_RE = /^\d{6}$/;
const ROLES = ["PATIENT", "HOSPITAL", "INSURANCE", "ADMIN"] as const;
type Role = (typeof ROLES)[number];
type SessionRole = "patient" | "hospital" | "insurance_agent" | "admin";

const SESSION_ROLE_MAP: Record<Role, SessionRole> = {
  PATIENT: "patient",
  HOSPITAL: "hospital",
  INSURANCE: "insurance_agent",
  ADMIN: "admin",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    if (!email || !OTP_RE.test(otp)) return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });

    const db = getDb();
    const { data: pending, error: pendingError } = await db.from("pending_registrations").select("id,email,name,password_hash,otp_hash,otp_expires_at,attempts,metadata").eq("email", email).maybeSingle<any>();
    if (pendingError) throw pendingError;
    if (!pending) return NextResponse.json({ error: "This verification session has expired. Please start registration again." }, { status: 410 });
    if (new Date(pending.otp_expires_at).getTime() <= Date.now()) {
      await db.from("pending_registrations").delete().eq("id", pending.id);
      return NextResponse.json({ error: "This verification code has expired. Please request a new code." }, { status: 410 });
    }
    if (pending.attempts >= OTP_MAX_ATTEMPTS) return NextResponse.json({ error: "Too many incorrect attempts. Please start registration again." }, { status: 429 });
    if (hashOtp(otp) !== pending.otp_hash) {
      await db.from("pending_registrations").update({ attempts: pending.attempts + 1 }).eq("id", pending.id);
      return NextResponse.json({ error: "Incorrect verification code. Please try again." }, { status: 400 });
    }

    const metadata = pending.metadata && typeof pending.metadata === "object" ? pending.metadata : {};
    const role = String(metadata.role || "").toUpperCase() as Role;
    const details = metadata.details && typeof metadata.details === "object" ? metadata.details : {};
    if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid registration role." }, { status: 400 });

    const { data: existingUser, error: existingError } = await db.from("users").select("id").eq("email", email).maybeSingle<{ id: string }>();
    if (existingError) throw existingError;
    if (existingUser) return NextResponse.json({ error: "An account with this email already exists. Please sign in instead.", redirectTo: "/login" }, { status: 409 });

    const { data: user, error: userError } = await db.from("users").insert({ email: pending.email, password_hash: pending.password_hash, name: pending.name, role, status: "ACTIVE", profile_details: details }).select("id,email,name,role,organization_id,status").single<any>();
    if (userError) {
      if (userError.code === "23505") return NextResponse.json({ error: "An account with this email already exists. Please sign in instead.", redirectTo: "/login" }, { status: 409 });
      throw userError;
    }
    await db.from("pending_registrations").delete().eq("id", pending.id);

    const sessionRole = SESSION_ROLE_MAP[role];
    const session = await createSession({ sub: user.id, email: user.email, name: user.name, role: sessionRole, ...(role === "PATIENT" ? { patientId: user.id } : {}) });
    const response = NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email, name: user.name, role }, redirectTo: dashboardForRole(sessionRole) }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("MediSync role registration verification failure:", error instanceof Error ? error.message : "Unknown registration error");
    return NextResponse.json({ error: "Unable to complete registration. Please try again." }, { status: 503 });
  }
}

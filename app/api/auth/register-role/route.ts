import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createOtp, hashOtp, OTP_TTL_MINUTES, sendRegistrationOtp } from "@/lib/registration-otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
const ROLES = ["PATIENT", "HOSPITAL", "INSURANCE", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const role = clean(body?.role).toUpperCase() as Role;
    const email = clean(body?.email).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    const details = body?.details && typeof body.details === "object" ? body.details : {};

    if (!ROLES.includes(role) || !EMAIL_RE.test(email) || !PASSWORD_RE.test(password)) {
      return NextResponse.json({ error: "Please provide valid registration details and a strong password." }, { status: 400 });
    }

    const required = role === "PATIENT"
      ? [details.name, details.dob, details.phone]
      : role === "HOSPITAL"
        ? [details.hospitalName, details.registrationId]
        : role === "INSURANCE"
          ? [details.agencyName, details.agencyId]
          : [details.name, details.adminId];
    if (required.some((value) => !clean(value))) {
      return NextResponse.json({ error: "Please complete all required fields for this portal." }, { status: 400 });
    }

    const db = getDb();
    const { data: existingUser, error: existingError } = await db.from("users").select("id").eq("email", email).maybeSingle<{ id: string }>();
    if (existingError) throw existingError;
    if (existingUser) return NextResponse.json({ error: "An account with this email already exists. Please sign in instead.", code: "ACCOUNT_EXISTS", redirectTo: "/login" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = createOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
    const name = role === "PATIENT" || role === "ADMIN" ? clean(details.name) : role === "HOSPITAL" ? clean(details.hospitalName) : clean(details.agencyName);

    const { error: pendingError } = await db.from("pending_registrations").upsert(
      { email, name, password_hash: passwordHash, otp_hash: hashOtp(otp), otp_expires_at: expiresAt, attempts: 0, metadata: { role, details } },
      { onConflict: "email" },
    );
    if (pendingError) throw pendingError;

    try { await sendRegistrationOtp(email, otp, name); }
    catch (error) {
      console.error("MediSync role registration email failure:", error instanceof Error ? error.message : "Unknown email error");
      return NextResponse.json({ error: "We could not send the verification email. Please try again." }, { status: 503 });
    }

    return NextResponse.json({ verificationRequired: true, email, role, expiresInSeconds: OTP_TTL_MINUTES * 60 }, { status: 202 });
  } catch (error) {
    console.error("MediSync role registration failure:", error instanceof Error ? error.message : "Unknown registration error");
    return NextResponse.json({ error: "Registration service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

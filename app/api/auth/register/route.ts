import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createOtp, hashOtp, OTP_TTL_MINUTES, sendRegistrationOtp } from "@/lib/registration-otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!EMAIL_RE.test(email) || !name || !PASSWORD_RE.test(password)) {
      return NextResponse.json({ error: "Use a valid name, email, and password with 10+ characters, including uppercase, lowercase, and a number." }, { status: 400 });
    }

    const db = getDb();
    const { data: existingUser, error: existingError } = await db.from("users").select("id").eq("email", email).maybeSingle<{ id: string }>();
    if (existingError) throw existingError;
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead.", code: "ACCOUNT_EXISTS", redirectTo: "/login" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = createOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

    const { error: pendingError } = await db.from("pending_registrations").upsert(
      { email, name, password_hash: passwordHash, otp_hash: hashOtp(otp), otp_expires_at: expiresAt, attempts: 0 },
      { onConflict: "email" },
    );
    if (pendingError) throw pendingError;

    await sendRegistrationOtp(email, otp, name);

    return NextResponse.json({ verificationRequired: true, email, expiresInSeconds: OTP_TTL_MINUTES * 60 }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Unable to send verification code. Please try again." }, { status: 503 });
  }
}

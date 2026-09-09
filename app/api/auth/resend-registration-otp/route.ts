import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createOtp, hashOtp, OTP_TTL_MINUTES, sendRegistrationOtp } from "@/lib/registration-otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const db = getDb();
    const { data: pending, error } = await db.from("pending_registrations").select("id,email,name").eq("email", email).maybeSingle<{ id: string; email: string; name: string }>();
    if (error) throw error;
    if (!pending) return NextResponse.json({ error: "No active verification was found. Please start registration again." }, { status: 404 });

    const otp = createOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
    const { error: updateError } = await db.from("pending_registrations").update({ otp_hash: hashOtp(otp), otp_expires_at: expiresAt, attempts: 0 }).eq("id", pending.id);
    if (updateError) throw updateError;
    await sendRegistrationOtp(pending.email, otp, pending.name);

    return NextResponse.json({ sent: true, expiresInSeconds: OTP_TTL_MINUTES * 60 });
  } catch {
    return NextResponse.json({ error: "Unable to resend verification code. Please try again." }, { status: 503 });
  }
}

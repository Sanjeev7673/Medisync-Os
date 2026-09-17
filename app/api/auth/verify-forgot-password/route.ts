import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { hashOtp } from "@/lib/registration-otp";

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !/^\d{6}$/.test(otp) || !PASSWORD_RE.test(password)) {
      return NextResponse.json({ error: "Enter the 6-digit OTP and a valid new password." }, { status: 400 });
    }

    const db = getDb();
    const { data: user, error: userError } = await db.from("users").select("id,session_version").eq("email", email).eq("status", "ACTIVE").maybeSingle<{ id: string; session_version: number }>();
    if (userError || !user) return NextResponse.json({ error: "Invalid OTP or email." }, { status: 400 });

    const { data: reset, error: resetError } = await db.from("password_reset_otps").select("id,otp_hash,expires_at,attempts").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle<{ id: string; otp_hash: string; expires_at: string; attempts: number }>();
    if (resetError) throw resetError;
    if (!reset || new Date(reset.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "OTP expired. Please request a new OTP." }, { status: 410 });
    if (reset.attempts >= 5) return NextResponse.json({ error: "Too many incorrect attempts. Please request a new OTP." }, { status: 429 });

    if (hashOtp(otp) !== reset.otp_hash) {
      await db.from("password_reset_otps").update({ attempts: reset.attempts + 1 }).eq("id", reset.id);
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { error: updateError } = await db.from("users").update({ password_hash: passwordHash, session_version: Number(user.session_version) + 1 }).eq("id", user.id);
    if (updateError) throw updateError;

    await db.from("password_reset_otps").delete().eq("user_id", user.id);
    return NextResponse.json({ message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    console.error("MediSync verify forgot password failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to reset your password. Please try again." }, { status: 503 });
  }
}

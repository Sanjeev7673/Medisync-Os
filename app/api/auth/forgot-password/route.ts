import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createOtp, hashOtp, OTP_TTL_MINUTES, sendRegistrationOtp } from "@/lib/registration-otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const generic = { message: "If an account exists for that email, a 6-digit OTP has been sent to the registered email." };
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    const db = getDb();
    const { data: user, error } = await db.from("users").select("id,email,name,status").eq("email", email).maybeSingle<{ id: string; email: string; name: string; status: string }>();
    if (error) throw error;

    if (user && user.status === "ACTIVE") {
      await db.from("password_reset_otps").delete().eq("user_id", user.id);
      const otp = createOtp();
      const { error: insertError } = await db.from("password_reset_otps").insert({
        user_id: user.id,
        email: user.email,
        otp_hash: hashOtp(otp),
        expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
      });
      if (insertError) throw insertError;
      await sendRegistrationOtp(user.email, otp, user.name);
    }

    return NextResponse.json(generic);
  } catch (error) {
    console.error("MediSync forgot password OTP failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(generic);
  }
}

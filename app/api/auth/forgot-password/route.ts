import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createPasswordResetToken, hashPasswordResetToken, PASSWORD_RESET_TTL_MINUTES, sendPasswordResetEmail } from "@/lib/password-reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const generic = { message: "If an account exists for that email, a password reset link has been sent." };
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    const db = getDb();
    const { data: user, error } = await db.from("users").select("id,email,name,status").eq("email", email).maybeSingle<{ id: string; email: string; name: string; status: string }>();
    if (error) throw error;

    if (user && user.status === "ACTIVE") {
      await db.from("password_resets").delete().eq("user_id", user.id).is("used_at", null);
      const token = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(token);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000).toISOString();
      const { error: insertError } = await db.from("password_resets").insert({ user_id: user.id, email: user.email, token_hash: tokenHash, expires_at: expiresAt });
      if (insertError) throw insertError;

      const origin = new URL(req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    }

    return NextResponse.json(generic);
  } catch (error) {
    console.error("MediSync forgot password failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(generic);
  }
}

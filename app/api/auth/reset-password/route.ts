import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/password-reset";

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!token || !PASSWORD_RE.test(password)) return NextResponse.json({ error: "Password must be at least 10 characters and include uppercase, lowercase and a number." }, { status: 400 });

    const db = getDb();
    const tokenHash = hashPasswordResetToken(token);
    const { data: reset, error: resetError } = await db.from("password_resets").select("id,user_id,expires_at,used_at").eq("token_hash", tokenHash).maybeSingle<{ id: string; user_id: string; expires_at: string; used_at: string | null }>();
    if (resetError) throw resetError;
    if (!reset || reset.used_at || new Date(reset.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "This password reset link is invalid or expired. Please request a new one." }, { status: 410 });

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: currentUser, error: currentUserError } = await db.from("users").select("session_version").eq("id", reset.user_id).single<{ session_version: number }>();
    if (currentUserError || !currentUser) throw currentUserError ?? new Error("User not found");

    const { error: userError } = await db.from("users").update({ password_hash: passwordHash, session_version: Number(currentUser.session_version) + 1 }).eq("id", reset.user_id);
    if (userError) throw userError;

    await db.from("password_resets").update({ used_at: new Date().toISOString() }).eq("id", reset.id);
    await db.from("password_resets").delete().eq("user_id", reset.user_id).neq("id", reset.id);

    return NextResponse.json({ message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    console.error("MediSync reset password failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to reset your password. Please try again." }, { status: 503 });
  }
}

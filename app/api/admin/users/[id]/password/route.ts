import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await context.params;

  try {
    const body = await req.json().catch(() => null);
    const password = typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "";
    if (!PASSWORD_RE.test(password)) return NextResponse.json({ error: "Password must be 10+ characters and include uppercase, lowercase, and a number" }, { status: 400 });

    const db = getDb();
    const { data: user, error: readError } = await db.from("users").select("id,session_version").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: updated, error } = await db.from("users")
      .update({ password_hash: passwordHash, session_version: Number(user.session_version) + 1 })
      .eq("id", id)
      .select("id,session_version")
      .single();
    if (error) throw error;

    await writeAudit({ actorUserId: auth.session.sub, action: "USER_PASSWORD_RESET", targetUserId: id, metadata: { newSessionVersion: updated.session_version } });
    return NextResponse.json({ passwordUpdated: true, sessionsRevoked: true });
  } catch {
    return NextResponse.json({ error: "Unable to reset password" }, { status: 503 });
  }
}

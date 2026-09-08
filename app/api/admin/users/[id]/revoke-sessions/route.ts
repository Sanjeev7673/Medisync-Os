import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await context.params;

  try {
    const db = getDb();
    const { data: user, error: readError } = await db.from("users").select("id,session_version,status").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: updated, error } = await db
      .from("users")
      .update({ session_version: Number(user.session_version) + 1 })
      .eq("id", id)
      .select("id,session_version,status")
      .single();
    if (error) throw error;

    await writeAudit({ actorUserId: auth.session.sub, action: "USER_SESSIONS_REVOKED", targetUserId: id, metadata: { newSessionVersion: updated.session_version } });
    return NextResponse.json({ revoked: true, user: updated });
  } catch {
    return NextResponse.json({ error: "Unable to revoke sessions" }, { status: 503 });
  }
}

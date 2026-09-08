import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const STATUSES = ["ACTIVE", "SUSPENDED", "DISABLED"] as const;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await context.params;

  try {
    const body = await req.json().catch(() => null);
    const status = typeof body?.status === "string" ? body.status.toUpperCase() : "";
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (id === auth.session.sub && status !== "ACTIVE") return NextResponse.json({ error: "An administrator cannot disable or suspend the current account" }, { status: 400 });

    const db = getDb();
    const { data: user, error: readError } = await db.from("users").select("id,session_version,status").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: updated, error } = await db.from("users")
      .update({ status, session_version: Number(user.session_version) + 1 })
      .eq("id", id)
      .select("id,status,session_version")
      .single();
    if (error) throw error;

    await writeAudit({ actorUserId: auth.session.sub, action: "USER_STATUS_CHANGED", targetUserId: id, metadata: { status } });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Unable to update account status" }, { status: 503 });
  }
}

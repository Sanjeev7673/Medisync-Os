import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const ROLES = ["PATIENT", "SPECIALIST", "HOSPITAL", "INSURANCE", "ADMIN"] as const;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await context.params;

  try {
    const body = await req.json().catch(() => null);
    const role = typeof body?.role === "string" ? body.role.toUpperCase() : "";
    const organizationId = typeof body?.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null;
    if (!ROLES.includes(role as (typeof ROLES)[number])) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (id === auth.session.sub && role !== "ADMIN") return NextResponse.json({ error: "The current administrator cannot remove their own admin role" }, { status: 400 });

    const db = getDb();
    const { data: user, error: readError } = await db.from("users").select("id,session_version,status").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: updated, error } = await db.from("users")
      .update({ role, organization_id: organizationId, session_version: Number(user.session_version) + 1 })
      .eq("id", id)
      .select("id,email,name,role,organization_id,status,session_version")
      .single();
    if (error) throw error;

    await writeAudit({ actorUserId: auth.session.sub, action: "USER_ROLE_CHANGED", targetUserId: id, metadata: { role, organizationId } });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Unable to update user role" }, { status: 503 });
  }
}

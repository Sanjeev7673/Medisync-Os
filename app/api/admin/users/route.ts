import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const STAFF_ROLES = ["SPECIALIST", "HOSPITAL", "INSURANCE", "ADMIN"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

type StaffRole = (typeof STAFF_ROLES)[number];

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const role = typeof body?.role === "string" ? body.role.toUpperCase() : "";
    const organizationId = typeof body?.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null;
    const temporaryPassword = typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "";

    if (!EMAIL_RE.test(email) || !name || !STAFF_ROLES.includes(role as StaffRole) || !PASSWORD_RE.test(temporaryPassword)) {
      return NextResponse.json({ error: "Valid name, email, staff role, and strong temporary password are required" }, { status: 400 });
    }

    const db = getDb();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const { data: user, error } = await db
      .from("users")
      .insert({ email, password_hash: passwordHash, name, role, organization_id: organizationId, status: "ACTIVE", session_version: 1 })
      .select("id,email,name,role,organization_id,status,session_version")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
      throw error;
    }

    await writeAudit({
      actorUserId: auth.session.sub,
      action: "STAFF_USER_CREATED",
      targetUserId: user.id,
      metadata: { role: user.role, organizationId: user.organization_id },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to provision staff account" }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, dashboardForRole, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    // Public self-registration creates patients only. Privileged roles are provisioned by authorized staff.
    if (!EMAIL_RE.test(email) || !name || !PASSWORD_RE.test(password)) {
      return NextResponse.json(
        { error: "Use a valid name, email, and password with 10+ characters, including uppercase, lowercase, and a number." },
        { status: 400 },
      );
    }

    const db = getDb();
    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await db
      .from("users")
      .insert({ email, password_hash: passwordHash, name, role: "PATIENT", status: "ACTIVE" })
      .select("id,email,name,role,organization_id,status")
      .single();

    if (error) {
      // Email is unique by design. Treat an expected duplicate as a client-actionable
      // conflict instead of presenting it as a registration service outage.
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "An account with this email already exists. Please sign in instead.",
            code: "ACCOUNT_EXISTS",
            redirectTo: "/login",
          },
          { status: 409 },
        );
      }
      throw error;
    }

    if (!user) throw new Error("Registration did not return the created user");

    const session = await createSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: "patient",
      patientId: user.id,
    });

    const response = NextResponse.json(
      {
        authenticated: true,
        user: { id: user.id, email: user.email, name: user.name, role: "patient" },
        redirectTo: dashboardForRole("patient"),
      },
      { status: 201 },
    );
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Registration service unavailable" }, { status: 503 });
  }
}

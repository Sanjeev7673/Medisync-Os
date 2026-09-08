import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  UserRole,
} from "@/lib/auth";

const selectableRoles: UserRole[] = [
  "patient",
  "hospital",
  "insurance_agent",
];

function dashboardForRole(role: UserRole) {
  if (role === "hospital") {
    return "/hospital/dashboard";
  }

  if (role === "insurance_agent") {
    return "/insurance/dashboard";
  }

  return "/patient/dashboard";
}

export async function GET(req: NextRequest) {
  const requestedRole =
    req.nextUrl.searchParams.get("role") as UserRole | null;

  const role =
    requestedRole &&
    selectableRoles.includes(requestedRole)
      ? requestedRole
      : "patient";

  const session = await createSession({
    sub: `demo-${role}`,
    email: `${role}@medisync.demo`,
    name:
      role === "patient"
        ? "Demo Patient"
        : role === "hospital"
          ? "Demo Hospital"
          : "Demo Insurance Agent",
    role,
    patientId: role === "patient" ? "P1001" : undefined,
  });

  const response = NextResponse.redirect(
    new URL(
      dashboardForRole(role),
      req.url,
    ),
  );

  response.cookies.set(
    SESSION_COOKIE,
    session,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  );

  return response;
}

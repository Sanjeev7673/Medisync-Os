import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  dashboardForRole,
  sessionCookieOptions,
  SESSION_COOKIE,
  UserRole,
} from "@/lib/auth";

// Temporary demo identities. These are not production authentication credentials.
// A persistent user/credential store is required before this endpoint is production-ready.
const selectableRoles: UserRole[] = [
  "patient",
  "hospital",
  "insurance_agent",
  "specialist",
  "admin",
];

export async function GET(req: NextRequest) {
  const requestedRole = req.nextUrl.searchParams.get("role") as UserRole | null;
  const role = requestedRole && selectableRoles.includes(requestedRole) ? requestedRole : "patient";

  const session = await createSession({
    sub: `demo-${role}`,
    email: `${role}@medisync.demo`,
    name:
      role === "patient"
        ? "Demo Patient"
        : role === "hospital"
          ? "Demo Hospital"
          : role === "insurance_agent"
            ? "Demo Insurance Agent"
            : role === "specialist"
              ? "Demo Specialist"
              : "Demo Admin",
    role,
    patientId: role === "patient" ? "P1001" : undefined,
    hospitalId: role === "hospital" ? "HOSP-001" : undefined,
    insuranceAgentId: role === "insurance_agent" ? "INS-001" : undefined,
  });

  const response = NextResponse.redirect(new URL(dashboardForRole(role), req.url));
  response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
  return response;
}

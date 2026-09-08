import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  dashboardForRole,
  SESSION_COOKIE,
  UserRole,
  verifySession,
} from "@/lib/auth";

export async function requirePageRole(allowedRoles: readonly UserRole[]) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) redirect("/login");
  if (!allowedRoles.includes(session.role)) redirect(dashboardForRole(session.role));

  return session;
}

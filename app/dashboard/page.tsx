import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  dashboardForRole,
  SESSION_COOKIE,
  verifySession,
} from "@/lib/auth";

export default async function DashboardEntry() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) redirect("/login");
  redirect(dashboardForRole(session.role));
}

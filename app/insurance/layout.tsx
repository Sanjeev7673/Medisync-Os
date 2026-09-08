import { requirePageRole } from "@/lib/rbac";

export default async function InsuranceLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["insurance_agent"]);
  return children;
}

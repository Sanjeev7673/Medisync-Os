import { requirePageRole } from "@/lib/rbac";

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["hospital"]);
  return children;
}

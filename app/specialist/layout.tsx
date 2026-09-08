import { requirePageRole } from "@/lib/rbac";

export default async function SpecialistLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["specialist"]);
  return children;
}

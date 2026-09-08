import { requirePageRole } from "@/lib/rbac";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["patient"]);
  return children;
}

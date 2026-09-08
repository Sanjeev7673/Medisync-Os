import { requirePageRole } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["admin"]);
  return children;
}

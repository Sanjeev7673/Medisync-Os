import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

export type Hospital = {
  id: string; organization_id: string | null; name: string; legal_name: string | null; registration_number: string | null;
  address_line1: string | null; address_line2: string | null; city: string | null; state: string | null; postal_code: string | null;
  country: string; phone: string | null; email: string | null; operational_status: "ACTIVE" | "INACTIVE" | "SUSPENDED"; created_at: string; updated_at: string;
};
export type HospitalCapability = { id: string; hospital_id: string; specialty: string | null; capability_type: "SPECIALTY" | "EQUIPMENT" | "SERVICE" | "FACILITY"; capability_name: string; insurance_networks: string[]; operational_status: "ACTIVE" | "INACTIVE"; metadata: Record<string, unknown> };

function assertStaffOrAdmin(session: Session) { if (!["hospital", "admin", "insurance_agent", "specialist"].includes(session.role)) throw new Error("FORBIDDEN"); }

export async function getHospital(session: Session, hospitalId: string) {
  assertStaffOrAdmin(session);
  const db = getDb();
  const { data, error } = await db.from("hospitals").select("*").eq("id", hospitalId).maybeSingle<Hospital>();
  if (error) throw error;
  if (!data) return null;
  if (session.role === "admin") return data;
  if (session.organizationId && data.organization_id !== session.organizationId) throw new Error("FORBIDDEN");
  if (session.role === "hospital" && session.hospitalId !== data.organization_id && session.hospitalId !== data.id) throw new Error("FORBIDDEN");
  return data;
}

export async function listHospitals(session: Session, specialty?: string) {
  assertStaffOrAdmin(session);
  const db = getDb();
  let query = db.from("hospitals").select("*").eq("operational_status", "ACTIVE").order("name");
  if (session.organizationId && session.role !== "admin") query = query.eq("organization_id", session.organizationId);
  if (specialty) {
    const { data, error } = await db.from("hospital_capabilities").select("hospital_id").eq("specialty", specialty).eq("operational_status", "ACTIVE").returns<{ hospital_id: string }[]>();
    if (error) throw error;
    const ids = [...new Set(data.map((x) => x.hospital_id))];
    if (!ids.length) return [];
    query = query.in("id", ids);
  }
  const { data, error } = await query.returns<Hospital[]>();
  if (error) throw error;
  return data;
}

export async function listCapabilities(session: Session, hospitalId: string) {
  const hospital = await getHospital(session, hospitalId);
  if (!hospital) return [];
  const { data, error } = await getDb().from("hospital_capabilities").select("*").eq("hospital_id", hospitalId).eq("operational_status", "ACTIVE").returns<HospitalCapability[]>();
  if (error) throw error;
  return data;
}

import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

export type Specialist = {
  id: string; user_id: string | null; full_name: string; specialty: string; sub_specialty: string | null; license_number: string | null;
  license_issuer: string | null; license_expires_at: string | null; credential_status: "PENDING" | "VERIFIED" | "EXPIRED" | "REJECTED";
  review_queue_status: "AVAILABLE" | "ASSIGNED" | "ON_HOLD" | "INACTIVE"; profile: Record<string, unknown>; created_at: string; updated_at: string;
};

function assertStaff(session: Session) { if (!["specialist", "hospital", "admin"].includes(session.role)) throw new Error("FORBIDDEN"); }

export async function getSpecialist(session: Session, specialistId: string) {
  assertStaff(session);
  const { data, error } = await getDb().from("specialists").select("*").eq("id", specialistId).maybeSingle<Specialist>();
  if (error) throw error;
  if (!data) return null;
  if (session.role === "specialist" && data.user_id !== session.sub) throw new Error("FORBIDDEN");
  return data;
}

export async function getMySpecialistProfile(session: Session) {
  if (session.role !== "specialist") throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("specialists").select("*").eq("user_id", session.sub).maybeSingle<Specialist>();
  if (error) throw error;
  return data;
}

export async function listSpecialists(session: Session, specialty?: string) {
  assertStaff(session);
  let query = getDb().from("specialists").select("*").eq("credential_status", "VERIFIED").eq("review_queue_status", "AVAILABLE").order("full_name");
  if (specialty) query = query.eq("specialty", specialty);
  const { data, error } = await query.returns<Specialist[]>();
  if (error) throw error;
  return data;
}

export async function listAffiliatedSpecialists(session: Session, hospitalId: string, specialty?: string) {
  assertStaff(session);
  const { data: links, error: linkError } = await getDb().from("specialist_hospital_affiliations").select("specialist_id").eq("hospital_id", hospitalId).eq("affiliation_status", "ACTIVE").returns<{ specialist_id: string }[]>();
  if (linkError) throw linkError;
  const ids = [...new Set(links.map((x) => x.specialist_id))];
  if (!ids.length) return [];
  let query = getDb().from("specialists").select("*").in("id", ids).eq("credential_status", "VERIFIED");
  if (specialty) query = query.eq("specialty", specialty);
  const { data, error } = await query.returns<Specialist[]>();
  if (error) throw error;
  return data;
}

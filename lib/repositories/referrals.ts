import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

type Referral = {
  id: string; referral_id: string; request_id: string; hospital_id: string; specialist_id: string | null;
  status: "CREATED" | "RECEIVED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "SCHEDULED" | "CANCELLED";
  clinical_summary: string | null; reason: string | null; received_at: string | null; reviewed_at: string | null; decided_at: string | null; created_at: string; updated_at: string;
};
const transitions: Record<Referral["status"], Referral["status"][]> = { CREATED: ["RECEIVED", "CANCELLED"], RECEIVED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["ACCEPTED", "REJECTED", "CANCELLED"], ACCEPTED: ["SCHEDULED", "CANCELLED"], REJECTED: [], SCHEDULED: ["CANCELLED"], CANCELLED: [] };
async function assertHospitalTenant(session: Session, hospitalId: string) { if (session.role !== "hospital" || !session.organizationId) throw new Error("FORBIDDEN"); const { data, error } = await getDb().from("hospitals").select("id, organization_id").eq("id", hospitalId).maybeSingle<{ id: string; organization_id: string | null }>(); if (error) throw error; if (!data || data.organization_id !== session.organizationId || (session.hospitalId && session.hospitalId !== data.id)) throw new Error("FORBIDDEN"); }
async function assertPatientAccess(session: Session, requestId: string) { if (session.role !== "patient" || session.sub !== session.patientId) throw new Error("FORBIDDEN"); const { data, error } = await getDb().from("requests").select("id").eq("id", requestId).eq("patient_id", session.patientId).maybeSingle<{ id: string }>(); if (error) throw error; if (!data) throw new Error("FORBIDDEN"); }
async function getReferralRow(referralId: string) { const { data, error } = await getDb().from("referrals").select("*").eq("referral_id", referralId).maybeSingle<Referral>(); if (error) throw error; return data; }
async function assertReferralAccess(session: Session, referral: Referral) {
  if (session.role === "admin") return;
  if (session.role === "patient") return assertPatientAccess(session, referral.request_id);
  if (session.role === "hospital") return assertHospitalTenant(session, referral.hospital_id);
  if (session.role === "specialist") {
    const { data, error } = await getDb().from("specialists").select("id").eq("user_id", session.sub).maybeSingle<{ id: string }>();
    if (error) throw error;
    if (!data || referral.specialist_id !== data.id) throw new Error("FORBIDDEN");
    return;
  }
  throw new Error("FORBIDDEN");
}

export async function createReferral(session: Session, input: { requestId: string; hospitalId: string; specialistId?: string; clinicalSummary?: string; reason?: string }) {
  if (!["admin", "hospital"].includes(session.role)) throw new Error("FORBIDDEN"); if (session.role === "hospital") await assertHospitalTenant(session, input.hospitalId);
  const referral_id = `REF-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await getDb().rpc("create_referral_with_audit", { p_referral_id: referral_id, p_request_id: input.requestId, p_hospital_id: input.hospitalId, p_specialist_id: input.specialistId ?? null, p_clinical_summary: input.clinicalSummary ?? null, p_reason: input.reason ?? null, p_actor_user_id: session.sub, p_actor_role: session.role }).single<Referral>(); if (error) throw error;
  return data;
}
export async function getReferral(session: Session, referralId: string) { const data = await getReferralRow(referralId); if (!data) return null; await assertReferralAccess(session, data); return data; }
export async function listReferralsForHospital(session: Session, hospitalId: string) { await assertHospitalTenant(session, hospitalId); const { data, error } = await getDb().from("referrals").select("*").eq("hospital_id", hospitalId).order("created_at", { ascending: false }).returns<Referral[]>(); if (error) throw error; return data; }
export async function transitionReferral(session: Session, referralId: string, nextStatus: Referral["status"]) {
  const current = await getReferralRow(referralId); if (!current) throw new Error("NOT_FOUND"); await assertReferralAccess(session, current); if (!transitions[current.status].includes(nextStatus)) throw new Error("INVALID_TRANSITION");
  if (session.role === "specialist" && !["UNDER_REVIEW", "ACCEPTED", "REJECTED", "CANCELLED"].includes(nextStatus)) throw new Error("FORBIDDEN"); if (session.role === "hospital" && !["RECEIVED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "SCHEDULED", "CANCELLED"].includes(nextStatus)) throw new Error("FORBIDDEN");
  const now = new Date().toISOString(); const received_at = nextStatus === "RECEIVED" ? now : null; const reviewed_at = nextStatus === "UNDER_REVIEW" ? now : null; const decided_at = ["ACCEPTED", "REJECTED"].includes(nextStatus) ? now : null;
  const { data, error } = await getDb().rpc("transition_referral_with_audit", { p_referral_db_id: current.id, p_expected_status: current.status, p_expected_updated_at: current.updated_at, p_next_status: nextStatus, p_received_at: received_at, p_reviewed_at: reviewed_at, p_decided_at: decided_at, p_actor_user_id: session.sub, p_actor_role: session.role }).single<Referral>(); if (error) throw error;
  return data;
}

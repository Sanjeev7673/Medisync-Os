import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";
import { appendAudit } from "@/lib/repositories/audit";

type Referral = {
  id: string; referral_id: string; request_id: string; hospital_id: string; specialist_id: string | null;
  status: "CREATED" | "RECEIVED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "SCHEDULED" | "CANCELLED";
  clinical_summary: string | null; reason: string | null; received_at: string | null; reviewed_at: string | null; decided_at: string | null; created_at: string; updated_at: string;
};

const transitions: Record<Referral["status"], Referral["status"][]> = {
  CREATED: ["RECEIVED", "CANCELLED"], RECEIVED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["SCHEDULED", "CANCELLED"], REJECTED: [], SCHEDULED: ["CANCELLED"], CANCELLED: [],
};

async function assertHospitalTenant(session: Session, hospitalId: string) {
  if (session.role !== "hospital" || !session.organizationId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("hospitals").select("id, organization_id").eq("id", hospitalId).maybeSingle<{ id: string; organization_id: string | null }>();
  if (error) throw error;
  if (!data || data.organization_id !== session.organizationId || (session.hospitalId && session.hospitalId !== data.id)) throw new Error("FORBIDDEN");
}

async function assertPatientAccess(session: Session, requestId: string) {
  if (session.role !== "patient" || session.sub !== session.patientId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("requests").select("id").eq("id", requestId).eq("patient_id", session.patientId).maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) throw new Error("FORBIDDEN");
}

async function getReferralRow(referralId: string) {
  const { data, error } = await getDb().from("referrals").select("*").eq("referral_id", referralId).maybeSingle<Referral>();
  if (error) throw error;
  return data;
}

async function assertReferralAccess(session: Session, referral: Referral) {
  if (session.role === "admin") return;
  if (session.role === "patient") return assertPatientAccess(session, referral.request_id);
  if (session.role === "hospital") return assertHospitalTenant(session, referral.hospital_id);
  if (session.role === "specialist") {
    if (referral.specialist_id !== session.sub) throw new Error("FORBIDDEN");
    return;
  }
  throw new Error("FORBIDDEN");
}

export async function createReferral(session: Session, input: { requestId: string; hospitalId: string; specialistId?: string; clinicalSummary?: string; reason?: string }) {
  if (!["admin", "hospital"].includes(session.role)) throw new Error("FORBIDDEN");
  if (session.role === "hospital") await assertHospitalTenant(session, input.hospitalId);
  const referral_id = `REF-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await getDb().from("referrals").insert({ referral_id, request_id: input.requestId, hospital_id: input.hospitalId, specialist_id: input.specialistId ?? null, clinical_summary: input.clinicalSummary ?? null, reason: input.reason ?? null }).select("*").single<Referral>();
  if (error) throw error;
  await appendAudit({ actorUserId: session.sub, actorRole: session.role, action: "REFERRAL_CREATED", entityType: "referral", entityId: data.id, requestId: data.request_id, newState: data.status, metadata: { referral_id: data.referral_id, hospital_id: data.hospital_id, specialist_id: data.specialist_id } });
  return data;
}

export async function getReferral(session: Session, referralId: string) {
  const data = await getReferralRow(referralId);
  if (!data) return null;
  await assertReferralAccess(session, data);
  return data;
}

export async function listReferralsForHospital(session: Session, hospitalId: string) {
  await assertHospitalTenant(session, hospitalId);
  const { data, error } = await getDb().from("referrals").select("*").eq("hospital_id", hospitalId).order("created_at", { ascending: false }).returns<Referral[]>();
  if (error) throw error;
  return data;
}

export async function transitionReferral(session: Session, referralId: string, nextStatus: Referral["status"]) {
  const current = await getReferralRow(referralId);
  if (!current) throw new Error("NOT_FOUND");
  await assertReferralAccess(session, current);
  if (!transitions[current.status].includes(nextStatus)) throw new Error("INVALID_TRANSITION");
  if (session.role === "specialist" && !["UNDER_REVIEW", "ACCEPTED", "REJECTED", "CANCELLED"].includes(nextStatus)) throw new Error("FORBIDDEN");
  if (session.role === "hospital" && !["RECEIVED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "SCHEDULED", "CANCELLED"].includes(nextStatus)) throw new Error("FORBIDDEN");
  const patch: Record<string, string | null> = { status: nextStatus };
  if (nextStatus === "RECEIVED") patch.received_at = new Date().toISOString();
  if (nextStatus === "UNDER_REVIEW") patch.reviewed_at = new Date().toISOString();
  if (["ACCEPTED", "REJECTED"].includes(nextStatus)) patch.decided_at = new Date().toISOString();
  const { data, error } = await getDb().from("referrals").update(patch).eq("id", current.id).eq("status", current.status).eq("updated_at", current.updated_at).select("*").single<Referral>();
  if (error) throw error;
  await appendAudit({ actorUserId: session.sub, actorRole: session.role, action: "REFERRAL_STATUS_CHANGED", entityType: "referral", entityId: data.id, requestId: data.request_id, previousState: current.status, newState: data.status, metadata: { referral_id: data.referral_id } });
  return data;
}

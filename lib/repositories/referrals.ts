import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

type Referral = {
  id: string; referral_id: string; request_id: string; hospital_id: string; specialist_id: string | null;
  status: "CREATED" | "RECEIVED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "SCHEDULED" | "CANCELLED";
  clinical_summary: string | null; reason: string | null; received_at: string | null; reviewed_at: string | null; decided_at: string | null; created_at: string; updated_at: string;
};

const transitions: Record<Referral["status"], Referral["status"][]> = {
  CREATED: ["RECEIVED", "CANCELLED"], RECEIVED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["SCHEDULED", "CANCELLED"], REJECTED: [], SCHEDULED: ["CANCELLED"], CANCELLED: [],
};

async function assertPatientAccess(session: Session, requestId: string) {
  if (session.role !== "patient" || session.sub !== session.patientId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("requests").select("id").eq("id", requestId).eq("patient_id", session.patientId).maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) throw new Error("FORBIDDEN");
}

export async function createReferral(session: Session, input: { requestId: string; hospitalId: string; specialistId?: string; clinicalSummary?: string; reason?: string }) {
  if (!["admin", "hospital", "specialist"].includes(session.role)) throw new Error("FORBIDDEN");
  const referral_id = `REF-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await getDb().from("referrals").insert({ referral_id, request_id: input.requestId, hospital_id: input.hospitalId, specialist_id: input.specialistId ?? null, clinical_summary: input.clinicalSummary ?? null, reason: input.reason ?? null }).select("*").single<Referral>();
  if (error) throw error;
  return data;
}

export async function getReferral(session: Session, referralId: string) {
  const { data, error } = await getDb().from("referrals").select("*").eq("referral_id", referralId).maybeSingle<Referral>();
  if (error) throw error;
  if (!data) return null;
  if (session.role === "admin") return data;
  if (session.role === "patient") {
    await assertPatientAccess(session, data.request_id);
    return data;
  }
  if (session.role === "hospital" && session.hospitalId && session.hospitalId !== data.hospital_id && session.organizationId !== data.hospital_id) throw new Error("FORBIDDEN");
  return data;
}

export async function transitionReferral(session: Session, referralId: string, nextStatus: Referral["status"]) {
  const current = await getReferral(session, referralId);
  if (!current) throw new Error("NOT_FOUND");
  if (!transitions[current.status].includes(nextStatus)) throw new Error("INVALID_TRANSITION");
  const patch: Record<string, string | null> = { status: nextStatus };
  if (nextStatus === "RECEIVED") patch.received_at = new Date().toISOString();
  if (nextStatus === "UNDER_REVIEW") patch.reviewed_at = new Date().toISOString();
  if (["ACCEPTED", "REJECTED"].includes(nextStatus)) patch.decided_at = new Date().toISOString();
  const { data, error } = await getDb().from("referrals").update(patch).eq("id", current.id).eq("status", current.status).select("*").single<Referral>();
  if (error) throw error;
  return data;
}

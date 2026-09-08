import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";
import type { PatientRequest, RequestType } from "@/lib/types";

type RequestStage = "CREATED" | "CLASSIFIED" | "SPECIALIST_REVIEW" | "HOSPITAL_MATCHING" | "REFERRAL" | "APPOINTMENT_PENDING" | "SCHEDULED" | "COMPLETED" | "REJECTED" | "CANCELLED";
type RequestRow = { id: string; request_id: string; patient_id: string; assigned_specialist_id: string | null; request_type: RequestType | null; description: string; request_source: PatientRequest["request_source"]; document_uploaded: boolean; workflow_stage: RequestStage; ai_classification: Record<string, unknown>; ai_confidence: number | null; ai_reason: string | null; created_at: string; updated_at: string };

const transitions: Record<RequestStage, RequestStage[]> = {
  CREATED: ["CLASSIFIED", "CANCELLED"], CLASSIFIED: ["SPECIALIST_REVIEW", "HOSPITAL_MATCHING", "REJECTED", "CANCELLED"], SPECIALIST_REVIEW: ["HOSPITAL_MATCHING", "REJECTED", "CANCELLED"],
  HOSPITAL_MATCHING: ["REFERRAL", "REJECTED", "CANCELLED"], REFERRAL: ["APPOINTMENT_PENDING", "REJECTED", "CANCELLED"], APPOINTMENT_PENDING: ["SCHEDULED", "CANCELLED"], SCHEDULED: ["COMPLETED", "CANCELLED"], COMPLETED: [], REJECTED: [], CANCELLED: [],
};

function assertPatientOwner(session: Session, patientId: string) { if (session.role !== "patient" || session.sub !== patientId || session.patientId !== patientId) throw new Error("FORBIDDEN"); }
async function getRequestRow(requestId: string) { const { data, error } = await getDb().from("requests").select("*").eq("request_id", requestId).maybeSingle<RequestRow>(); if (error) throw error; return data; }
async function assertHospitalTenant(session: Session, requestId: string) {
  if (session.role !== "hospital" || !session.organizationId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("referrals").select("hospital_id, hospitals!inner(id, organization_id)").eq("request_id", requestId).returns<{ hospital_id: string; hospitals: { id: string; organization_id: string | null } }[]>();
  if (error) throw error;
  if (!data.some((x) => x.hospitals.organization_id === session.organizationId && (!session.hospitalId || session.hospitalId === x.hospital_id))) throw new Error("FORBIDDEN");
}
async function assertWorkflowActor(session: Session, row: RequestRow, nextStage: RequestStage) {
  if (session.role === "admin") return;
  if (session.role === "patient") throw new Error("FORBIDDEN");
  if (session.role === "specialist") {
    if (row.workflow_stage !== "SPECIALIST_REVIEW" || !row.assigned_specialist_id) throw new Error("FORBIDDEN");
    const { data, error } = await getDb().from("specialists").select("id, user_id").eq("id", row.assigned_specialist_id).maybeSingle<{ id: string; user_id: string | null }>();
    if (error) throw error; if (!data || data.user_id !== session.sub) throw new Error("FORBIDDEN");
    if (!["HOSPITAL_MATCHING", "REJECTED", "CANCELLED"].includes(nextStage)) throw new Error("FORBIDDEN"); return;
  }
  if (session.role === "hospital") {
    if (!["HOSPITAL_MATCHING", "REFERRAL", "APPOINTMENT_PENDING", "SCHEDULED", "REJECTED", "CANCELLED"].includes(nextStage)) throw new Error("FORBIDDEN");
    await assertHospitalTenant(session, row.id); return;
  }
  throw new Error("FORBIDDEN");
}
function toPatientRequest(row: RequestRow): PatientRequest {
  const ai = row.ai_classification ?? {};
  return { request_id: row.request_id, patient_id: row.patient_id, request: row.description, request_source: row.request_source, document_uploaded: row.document_uploaded, request_type: row.request_type,
    specialty: typeof ai.specialty === "string" ? ai.specialty : null, specialist_review_required: typeof ai.specialist_review_required === "boolean" ? ai.specialist_review_required : null,
    document_required: typeof ai.document_required === "boolean" ? ai.document_required : null, classification_reason: row.ai_reason,
    specialist_review: { status: row.workflow_stage === "SPECIALIST_REVIEW" ? "PENDING" : null, reviewed_by: row.assigned_specialist_id, reviewed_at: null, notes: null }, hospital_matching: { status: row.workflow_stage === "HOSPITAL_MATCHING" ? "IN_PROGRESS" : null, recommendations: [] }, referral: { status: row.workflow_stage === "REFERRAL" ? "CREATED" : null, referral_id: null, hospital_id: null }, appointment: { status: row.workflow_stage === "APPOINTMENT_PENDING" ? "PENDING" : row.workflow_stage === "SCHEDULED" ? "SCHEDULED" : null, scheduled_at: null },
    workflow_status: row.workflow_stage === "SPECIALIST_REVIEW" ? "PENDING_REVIEW" : row.workflow_stage === "HOSPITAL_MATCHING" ? "HOSPITAL_MATCHING" : row.workflow_stage === "REFERRAL" ? "REFERRAL_CREATED" : row.workflow_stage === "APPOINTMENT_PENDING" ? "APPOINTMENT_PENDING" : row.workflow_stage as PatientRequest["workflow_status"], created_at: row.created_at, updated_at: row.updated_at };
}

export async function createRequest(session: Session, input: { request: string; document_uploaded?: boolean; request_source?: PatientRequest["request_source"] }) {
  if (session.role !== "patient" || !session.patientId || session.sub !== session.patientId) throw new Error("FORBIDDEN");
  const description = input.request.trim(); if (!description) throw new Error("INVALID_REQUEST");
  const requestId = `REQ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await getDb().rpc("create_request_with_audit", { p_request_id: requestId, p_patient_id: session.patientId, p_description: description, p_request_source: input.request_source ?? "patient_portal", p_document_uploaded: Boolean(input.document_uploaded), p_actor_user_id: session.sub, p_actor_role: session.role }).single<RequestRow>();
  if (error) throw error;
  return { ...toPatientRequest(data), db_id: data.id };
}
export async function listRequestsForPatient(session: Session) { if (!session.patientId) throw new Error("FORBIDDEN"); assertPatientOwner(session, session.patientId); const { data, error } = await getDb().from("requests").select("*").eq("patient_id", session.patientId).order("created_at", { ascending: false }).returns<RequestRow[]>(); if (error) throw error; return data.map(toPatientRequest); }
export async function getRequestForPatient(session: Session, requestId: string) { if (!session.patientId) throw new Error("FORBIDDEN"); const { data, error } = await getDb().from("requests").select("*").eq("request_id", requestId).eq("patient_id", session.patientId).maybeSingle<RequestRow>(); if (error) throw error; return data ? toPatientRequest(data) : null; }

export async function assignSpecialist(session: Session, requestId: string, specialistId: string) {
  if (!["admin", "hospital"].includes(session.role)) throw new Error("FORBIDDEN"); const current = await getRequestRow(requestId); if (!current) throw new Error("NOT_FOUND"); if (session.role === "hospital") await assertHospitalTenant(session, current.id);
  const { data: specialist, error: specialistError } = await getDb().from("specialists").select("id, credential_status, review_queue_status").eq("id", specialistId).maybeSingle<{ id: string; credential_status: string; review_queue_status: string }>();
  if (specialistError) throw specialistError; if (!specialist || specialist.credential_status !== "VERIFIED" || specialist.review_queue_status === "INACTIVE") throw new Error("INVALID_SPECIALIST");
  const { data, error } = await getDb().rpc("assign_specialist_with_audit", { p_request_db_id: current.id, p_expected_updated_at: current.updated_at, p_specialist_id: specialistId, p_actor_user_id: session.sub, p_actor_role: session.role }).single<RequestRow>(); if (error) throw error;
  return toPatientRequest(data);
}

export async function advanceRequest(session: Session, requestId: string, workflowStage: RequestStage) {
  const current = await getRequestRow(requestId); if (!current) throw new Error("NOT_FOUND"); if (!transitions[current.workflow_stage].includes(workflowStage)) throw new Error("INVALID_TRANSITION"); await assertWorkflowActor(session, current, workflowStage);
  const { data, error } = await getDb().rpc("update_request_stage_with_audit", { p_request_db_id: current.id, p_expected_stage: current.workflow_stage, p_expected_updated_at: current.updated_at, p_next_stage: workflowStage, p_actor_user_id: session.sub, p_actor_role: session.role }).single<RequestRow>(); if (error) throw error;
  return toPatientRequest(data);
}

export async function updateClassification(session: Session, requestId: string, input: { requestType: RequestType; specialty?: string; specialistReviewRequired?: boolean; documentRequired?: boolean; reason?: string; confidence?: number }) {
  if (!session.patientId || session.sub !== session.patientId) throw new Error("FORBIDDEN"); const current = await getRequestRow(requestId); if (!current || current.patient_id !== session.patientId) throw new Error("FORBIDDEN"); if (current.workflow_stage !== "CREATED") throw new Error("INVALID_TRANSITION");
  const ai_classification = { request_type: input.requestType, specialty: input.specialty ?? "", specialist_review_required: Boolean(input.specialistReviewRequired), document_required: Boolean(input.documentRequired) };
  const { data, error } = await getDb().rpc("classify_request_with_audit", { p_request_db_id: current.id, p_expected_updated_at: current.updated_at, p_request_type: input.requestType, p_ai_classification: ai_classification, p_ai_confidence: input.confidence ?? null, p_ai_reason: input.reason ?? null, p_actor_user_id: session.sub, p_actor_role: session.role }).single<RequestRow>(); if (error) throw error;
  return toPatientRequest(data);
}

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";
import type { PatientRequest, RequestType } from "@/lib/types";

type RequestRow = {
  id: string; request_id: string; patient_id: string; request_type: RequestType | null; description: string;
  request_source: PatientRequest["request_source"]; document_uploaded: boolean; workflow_stage: string;
  ai_classification: Record<string, unknown>; ai_confidence: number | null; ai_reason: string | null;
  created_at: string; updated_at: string;
};

function assertPatientOwner(session: Session, patientId: string) {
  if (session.role !== "patient" || session.sub !== patientId || session.patientId !== patientId) {
    throw new Error("FORBIDDEN");
  }
}

function toPatientRequest(row: RequestRow): PatientRequest {
  const ai = row.ai_classification ?? {};
  return {
    request_id: row.request_id,
    patient_id: row.patient_id,
    request: row.description,
    request_source: row.request_source,
    document_uploaded: row.document_uploaded,
    request_type: row.request_type,
    specialty: typeof ai.specialty === "string" ? ai.specialty : null,
    specialist_review_required: typeof ai.specialist_review_required === "boolean" ? ai.specialist_review_required : null,
    document_required: typeof ai.document_required === "boolean" ? ai.document_required : null,
    classification_reason: row.ai_reason,
    specialist_review: { status: row.workflow_stage === "SPECIALIST_REVIEW" ? "PENDING" : null, reviewed_by: null, reviewed_at: null, notes: null },
    hospital_matching: { status: row.workflow_stage === "HOSPITAL_MATCHING" ? "IN_PROGRESS" : null, recommendations: [] },
    referral: { status: row.workflow_stage === "REFERRAL" ? "CREATED" : null, referral_id: null, hospital_id: null },
    appointment: { status: row.workflow_stage === "APPOINTMENT_PENDING" ? "PENDING" : row.workflow_stage === "SCHEDULED" ? "SCHEDULED" : null, scheduled_at: null },
    workflow_status: row.workflow_stage === "SPECIALIST_REVIEW" ? "PENDING_REVIEW" : row.workflow_stage === "HOSPITAL_MATCHING" ? "HOSPITAL_MATCHING" : row.workflow_stage === "REFERRAL" ? "REFERRAL_CREATED" : row.workflow_stage === "APPOINTMENT_PENDING" ? "APPOINTMENT_PENDING" : row.workflow_stage as PatientRequest["workflow_status"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createRequest(session: Session, input: { request: string; document_uploaded?: boolean; request_source?: PatientRequest["request_source"] }) {
  if (session.role !== "patient" || !session.patientId || session.sub !== session.patientId) throw new Error("FORBIDDEN");
  const description = input.request.trim();
  if (!description) throw new Error("INVALID_REQUEST");

  const row = {
    request_id: `REQ-${randomUUID().slice(0, 8).toUpperCase()}`,
    patient_id: session.patientId,
    description,
    request_source: input.request_source ?? "patient_portal",
    document_uploaded: Boolean(input.document_uploaded),
  };
  const { data, error } = await getDb().from("requests").insert(row).select("*").single<RequestRow>();
  if (error) throw error;
  return toPatientRequest(data);
}

export async function listRequestsForPatient(session: Session) {
  if (!session.patientId) throw new Error("FORBIDDEN");
  assertPatientOwner(session, session.patientId);
  const { data, error } = await getDb().from("requests").select("*").eq("patient_id", session.patientId).order("created_at", { ascending: false }).returns<RequestRow[]>();
  if (error) throw error;
  return data.map(toPatientRequest);
}

export async function getRequestForPatient(session: Session, requestId: string) {
  if (!session.patientId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("requests").select("*").eq("request_id", requestId).eq("patient_id", session.patientId).maybeSingle<RequestRow>();
  if (error) throw error;
  return data ? toPatientRequest(data) : null;
}

export async function advanceRequest(session: Session, requestId: string, workflowStage: RequestRow["workflow_stage"]) {
  if (!session.patientId) throw new Error("FORBIDDEN");
  const allowed = ["CREATED", "CLASSIFIED", "SPECIALIST_REVIEW", "HOSPITAL_MATCHING", "REFERRAL", "APPOINTMENT_PENDING", "SCHEDULED", "COMPLETED", "REJECTED", "CANCELLED"];
  if (!allowed.includes(workflowStage)) throw new Error("INVALID_STAGE");
  const { data, error } = await getDb().from("requests").update({ workflow_stage: workflowStage }).eq("request_id", requestId).eq("patient_id", session.patientId).select("*").single<RequestRow>();
  if (error) throw error;
  return toPatientRequest(data);
}

export async function updateClassification(session: Session, requestId: string, input: { requestType: RequestType; specialty?: string; specialistReviewRequired?: boolean; documentRequired?: boolean; reason?: string; confidence?: number }) {
  if (!session.patientId) throw new Error("FORBIDDEN");
  const ai_classification = { request_type: input.requestType, specialty: input.specialty ?? "", specialist_review_required: Boolean(input.specialistReviewRequired), document_required: Boolean(input.documentRequired) };
  const { data, error } = await getDb().from("requests").update({ request_type: input.requestType, workflow_stage: "CLASSIFIED", ai_classification, ai_confidence: input.confidence ?? null, ai_reason: input.reason ?? null }).eq("request_id", requestId).eq("patient_id", session.patientId).select("*").single<RequestRow>();
  if (error) throw error;
  return toPatientRequest(data);
}

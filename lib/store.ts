import { randomUUID } from "crypto";
import { AuditEvent, PatientRequest, WorkflowStatus } from "./types";

const requests = new Map<string, PatientRequest>();
const auditLog: AuditEvent[] = [];

function now() { return new Date().toISOString(); }

function seed() {
  if (requests.size > 0) return;
  const created = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const updated = now();
  const seeded: PatientRequest = {
    request_id: "REQ-1001",
    patient_id: "P1001",
    request: "I have a heart-related health concern and need to consult a cardiologist. Please help me find the appropriate specialist.",
    request_source: "patient_portal",
    document_uploaded: false,
    request_type: "SPECIALIST_REVIEW",
    specialty: "Cardiology",
    specialist_review_required: true,
    document_required: false,
    classification_reason: "Patient requests assistance in finding a cardiologist for a heart-related concern.",
    ai_confidence: null,
    specialist_review: { status: "APPROVED", reviewed_by: "specialist-demo", reviewed_at: updated, notes: "Specialist review approved for cardiology routing." },
    hospital_matching: { status: "COMPLETED", recommendations: [{ hospital_id: "HOSP-001", hospital_name: "MediSync General Hospital", match_score: 94, matched_capabilities: ["Cardiology", "Cardiac diagnostics", "Specialist consultation"], missing_capabilities: [], reason: "Strong capability match for cardiology specialist coordination." }] },
    referral: { status: "CREATED", referral_id: "REF-1001", hospital_id: "HOSP-001" },
    appointment: { status: "PENDING", scheduled_at: null },
    workflow_status: "APPOINTMENT_PENDING",
    created_at: created,
    updated_at: updated,
  };
  requests.set(seeded.request_id, seeded);
  auditLog.push({ audit_id: randomUUID(), request_id: seeded.request_id, event_type: "REQUEST_CREATED", detail: "Seeded demo request created.", actor: "system", created_at: created });
}

seed();

export async function listRequestsForPatient(patientId: string) {
  seed();
  return Array.from(requests.values()).filter((request) => request.patient_id === patientId);
}

export async function getRequest(requestId: string) {
  seed();
  return requests.get(requestId) ?? null;
}

export async function putRequest(request: PatientRequest) {
  seed();
  requests.set(request.request_id, request);
  return request;
}

type CreateRequestInput = {
  patient_id: string;
  request: string;
  request_source: PatientRequest["request_source"];
  document_uploaded: boolean;
} & Partial<Omit<PatientRequest, "request_id" | "created_at" | "updated_at" | "patient_id" | "request" | "request_source" | "document_uploaded">>;

export async function createRequest(input: CreateRequestInput) {
  seed();
  const timestamp = now();
  const request: PatientRequest = {
    request_id: `REQ-${Date.now()}`,
    patient_id: input.patient_id,
    request: input.request,
    request_source: input.request_source,
    document_uploaded: input.document_uploaded,
    request_type: input.request_type ?? null,
    specialty: input.specialty ?? null,
    specialist_review_required: input.specialist_review_required ?? null,
    document_required: input.document_required ?? null,
    classification_reason: input.classification_reason ?? null,
    ai_confidence: input.ai_confidence ?? null,
    specialist_review: input.specialist_review ?? { status: null, reviewed_by: null, reviewed_at: null, notes: null },
    hospital_matching: input.hospital_matching ?? { status: null, recommendations: [] },
    referral: input.referral ?? { status: null, referral_id: null, hospital_id: null },
    appointment: input.appointment ?? { status: null, scheduled_at: null },
    workflow_status: input.workflow_status ?? "CREATED",
    created_at: timestamp,
    updated_at: timestamp,
  };
  requests.set(request.request_id, request);
  await appendAudit(request.request_id, "REQUEST_CREATED", "Request created.", "patient");
  return request;
}

type AuditInput = {
  request_id: string;
  event_type: string;
  detail: string;
  actor?: string;
};

export async function appendAudit(
  requestIdOrInput: string | AuditInput,
  eventType?: string,
  detail?: string,
  actor = "system",
) {
  const input: AuditInput = typeof requestIdOrInput === "string"
    ? { request_id: requestIdOrInput, event_type: eventType ?? "", detail: detail ?? "", actor }
    : requestIdOrInput;

  const event: AuditEvent = {
    audit_id: randomUUID(),
    request_id: input.request_id,
    event_type: input.event_type,
    detail: input.detail,
    actor: input.actor ?? "system",
    created_at: now(),
  };
  auditLog.push(event);
  return event;
}

export async function listAuditForRequest(requestId: string) {
  seed();
  return auditLog.filter((event) => event.request_id === requestId);
}

export async function updateRequestStatus(requestId: string, workflowStatus: WorkflowStatus) {
  const request = await getRequest(requestId);
  if (!request) return null;
  const updated = { ...request, workflow_status: workflowStatus, updated_at: now() };
  requests.set(requestId, updated);
  return updated;
}

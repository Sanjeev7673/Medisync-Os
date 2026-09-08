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

export async function createRequest(input: Omit<PatientRequest, "request_id" | "created_at" | "updated_at">) {
  seed();
  const timestamp = now();
  const request: PatientRequest = { ...input, request_id: `REQ-${Date.now()}`, created_at: timestamp, updated_at: timestamp };
  requests.set(request.request_id, request);
  await appendAudit(request.request_id, "REQUEST_CREATED", "Request created.", "patient");
  return request;
}

export async function appendAudit(requestId: string, eventType: string, detail: string, actor = "system") {
  const event: AuditEvent = { audit_id: randomUUID(), request_id: requestId, event_type: eventType, detail, actor, created_at: now() };
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

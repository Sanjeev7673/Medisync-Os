// ---------------------------------------------------------------------------
// STATUS: 🟡 STAND-IN IMPLEMENTATION — not DynamoDB.
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import { AuditEvent, PatientRequest } from "./types";

const requests = new Map<string, PatientRequest>();
const auditLog: AuditEvent[] = [];

function seed() {
  if (requests.size > 0) return;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const seeded: PatientRequest = {
    request_id: "REQ-1001",
    patient_id: "P1001",
    request:
      "I have a heart-related health concern and need to consult a cardiologist. Please help me find the appropriate specialist.",
    request_source: "patient_portal",
    document_uploaded: false,
    request_type: "SPECIALIST_REVIEW",
    specialty: "Cardiology",
    specialist_review_required: true,
    document_required: false,
    classification_reason:
      "The patient is requesting assistance finding the appropriate specialist.",
    specialist_review: {
      status: "APPROVED",
      reviewed_by: "DR-CARD-01",
      reviewed_at: hourAgo.toISOString(),
      notes: null,
    },
    hospital_matching: {
      status: "COMPLETED",
      recommendations: [
        {
          hospital_id: "H001",
          hospital_name: "Hospital A",
          match_score: 0.94,
          matched_capabilities: ["Cardiology", "Cardiac Imaging", "ICU"],
          missing_capabilities: [],
          reason: "Hospital has the required specialty and capabilities.",
        },
      ],
    },
    referral: {
      status: "CREATED",
      referral_id: "REF-2001",
      hospital_id: "H001",
    },
    appointment: {
      status: "PENDING",
      scheduled_at: null,
    },
    workflow_status: "APPOINTMENT_PENDING",
    created_at: hourAgo.toISOString(),
    updated_at: now.toISOString(),
  };

  requests.set(seeded.request_id, seeded);
}
seed();

export function listRequestsForPatient(patientId: string): PatientRequest[] {
  return Array.from(requests.values())
    .filter((r) => r.patient_id === patientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getRequest(requestId: string): PatientRequest | undefined {
  return requests.get(requestId);
}

export function putRequest(request: PatientRequest): void {
  request.updated_at = new Date().toISOString();
  requests.set(request.request_id, request);
}

export function createRequest(input: {
  patient_id: string;
  request: string;
  request_source: PatientRequest["request_source"];
  document_uploaded: boolean;
}): PatientRequest {
  const now = new Date().toISOString();
  const record: PatientRequest = {
    request_id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
    patient_id: input.patient_id,
    request: input.request,
    request_source: input.request_source,
    document_uploaded: input.document_uploaded,
    request_type: null,
    specialty: null,
    specialist_review_required: null,
    document_required: null,
    classification_reason: null,
    specialist_review: {
      status: null,
      reviewed_by: null,
      reviewed_at: null,
      notes: null,
    },
    hospital_matching: { status: null, recommendations: [] },
    referral: { status: null, referral_id: null, hospital_id: null },
    appointment: { status: null, scheduled_at: null },
    workflow_status: "CREATED",
    created_at: now,
    updated_at: now,
  };
  requests.set(record.request_id, record);
  return record;
}

export function appendAudit(event: Omit<AuditEvent, "audit_id" | "created_at">): AuditEvent {
  const record: AuditEvent = {
    ...event,
    audit_id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  auditLog.push(record);
  return record;
}

export function listAuditForRequest(requestId: string): AuditEvent[] {
  return auditLog
    .filter((e) => e.request_id === requestId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
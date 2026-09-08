// ---------------------------------------------------------------------------
// STATUS: 🟢 AWS-free in-memory persistence.
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import { AuditEvent, PatientRequest } from "./types";

type StoredRequest = PatientRequest & {
  audit_events?: AuditEvent[];
};

const requests = new Map<string, StoredRequest>();

function stripInternalFields(
  item: StoredRequest | undefined,
): PatientRequest | undefined {
  if (!item) return undefined;

  const { audit_events: _auditEvents, ...request } = item;
  return request;
}

function ensureSeeded(): void {
  if (requests.has("REQ-1001")) return;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const seeded: StoredRequest = {
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
          matched_capabilities: [
            "Cardiology",
            "Cardiac Imaging",
            "ICU",
          ],
          missing_capabilities: [],
          reason:
            "Hospital has the required specialty and capabilities.",
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

    audit_events: [],
  };

  requests.set(seeded.request_id, seeded);
}

export async function listRequestsForPatient(
  patientId: string,
): Promise<PatientRequest[]> {
  ensureSeeded();

  return Array.from(requests.values())
    .filter((record) => record.patient_id === patientId)
    .map((record) => stripInternalFields(record)!)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getRequest(
  requestId: string,
): Promise<PatientRequest | undefined> {
  ensureSeeded();

  return stripInternalFields(requests.get(requestId));
}

export async function putRequest(
  request: PatientRequest,
): Promise<void> {
  ensureSeeded();

  const existing = requests.get(request.request_id);

  if (!existing) {
    throw new Error(
      `Cannot update unknown request: ${request.request_id}`,
    );
  }

  requests.set(request.request_id, {
    ...request,
    updated_at: new Date().toISOString(),
    audit_events: existing.audit_events ?? [],
  });
}

export async function createRequest(input: {
  patient_id: string;
  request: string;
  request_source: PatientRequest["request_source"];
  document_uploaded: boolean;
}): Promise<PatientRequest> {
  ensureSeeded();

  const now = new Date().toISOString();

  const record: PatientRequest = {
    request_id: `REQ-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase()}`,

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

    hospital_matching: {
      status: null,
      recommendations: [],
    },

    referral: {
      status: null,
      referral_id: null,
      hospital_id: null,
    },

    appointment: {
      status: null,
      scheduled_at: null,
    },

    workflow_status: "CREATED",
    created_at: now,
    updated_at: now,
  };

  requests.set(record.request_id, {
    ...record,
    audit_events: [],
  });

  return record;
}

export async function appendAudit(
  event: Omit<AuditEvent, "audit_id" | "created_at">,
): Promise<AuditEvent> {
  ensureSeeded();

  const record: AuditEvent = {
    ...event,
    audit_id: randomUUID(),
    created_at: new Date().toISOString(),
  };

  const existing = requests.get(record.request_id);

  if (!existing) {
    throw new Error(
      `Cannot add audit event to unknown request: ${record.request_id}`,
    );
  }

  existing.audit_events = [
    ...(existing.audit_events ?? []),
    record,
  ];

  existing.updated_at = new Date().toISOString();

  requests.set(record.request_id, existing);

  return record;
}

export async function listAuditForRequest(
  requestId: string,
): Promise<AuditEvent[]> {
  ensureSeeded();

  const record = requests.get(requestId);

  return [...(record?.audit_events ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}

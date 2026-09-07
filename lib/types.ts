// Data model — mirrors the entities defined in the MediSync architecture
// (Section 24 / 26 of the product brief). Field names are chosen to map
// directly onto DynamoDB attribute names once the real table is wired up,
// so this file changes shape as little as possible when lib/store.ts is
// swapped from the in-memory implementation to the AWS SDK client.

export type RequestType =
  | "GENERAL"
  | "APPOINTMENT"
  | "DOCUMENT"
  | "SPECIALIST_REVIEW"
  | "HOSPITAL_MATCH"
  | "ADMINISTRATION";

export type WorkflowStatus =
  | "CREATED"
  | "VALIDATING"
  | "CLASSIFIED"
  | "ROUTED"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "MORE_INFORMATION_REQUIRED"
  | "HOSPITAL_MATCHING"
  | "REFERRAL_CREATED"
  | "APPOINTMENT_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export interface HospitalRecommendation {
  hospital_id: string;
  hospital_name: string;
  match_score: number;
  matched_capabilities: string[];
  missing_capabilities: string[];
  reason: string;
}

export interface PatientRequest {
  request_id: string;
  patient_id: string;
  request: string;
  request_source: "patient_portal" | "specialist_portal" | "api";
  document_uploaded: boolean;
  request_type: RequestType | null;
  specialty: string | null;
  specialist_review_required: boolean | null;
  document_required: boolean | null;
  classification_reason: string | null;
  specialist_review: {
    status: "PENDING" | "APPROVED" | "REJECTED" | "MORE_INFORMATION_REQUIRED" | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    notes: string | null;
  };
  hospital_matching: {
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NO_MATCH" | null;
    recommendations: HospitalRecommendation[];
  };
  referral: {
    status: "PENDING" | "CREATED" | "SENT" | "ACCEPTED" | "REJECTED" | null;
    referral_id: string | null;
    hospital_id: string | null;
  };
  appointment: {
    status: "PENDING" | "SCHEDULED" | "COMPLETED" | null;
    scheduled_at: string | null;
  };
  workflow_status: WorkflowStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  audit_id: string;
  request_id: string;
  event_type: string;
  detail: string;
  actor: string;
  created_at: string;
}

export interface RequestStatusResponse {
  request_id: string;
  patient_id: string;
  request_type: RequestType | null;
  specialty: string | null;
  specialist_review_required: boolean | null;
  document_required: boolean | null;
  specialist_review: PatientRequest["specialist_review"];
  hospital_matching: PatientRequest["hospital_matching"];
  referral: PatientRequest["referral"];
  appointment: PatientRequest["appointment"];
  workflow_status: WorkflowStatus;
}
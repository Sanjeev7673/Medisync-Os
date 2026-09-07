import { NextRequest, NextResponse } from "next/server";
import { appendAudit, getRequest, putRequest } from "@/lib/store";
import { WorkflowStatus } from "@/lib/types";

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.MEDISYNC_WEBHOOK_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ error: "Webhook authentication is not configured" }, { status: 500 });
  }

  const providedSecret = req.headers.get("X-MediSync-Webhook-Secret");
  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.request_id || !body?.stage) return NextResponse.json({ error: "request_id and stage are required" }, { status: 400 });
  const record = getRequest(body.request_id);
  if (!record) return NextResponse.json({ error: "Unknown request_id" }, { status: 404 });

  switch (body.stage) {
    case "classification":
      record.request_type = body.payload?.request_type ?? record.request_type;
      record.specialty = body.payload?.specialty ?? record.specialty;
      record.specialist_review_required = body.payload?.specialist_review_required ?? record.specialist_review_required;
      record.document_required = body.payload?.document_required ?? record.document_required;
      record.classification_reason = body.payload?.reason ?? record.classification_reason;
      record.workflow_status = "CLASSIFIED" as WorkflowStatus;
      appendAudit({ request_id: record.request_id, event_type: "REQUEST_CLASSIFIED", detail: `Classified as ${record.request_type} (${record.specialty ?? "n/a"})`, actor: "system" });
      break;
    case "specialist_review":
      record.specialist_review.status = body.payload?.status ?? record.specialist_review.status;
      record.specialist_review.reviewed_by = body.payload?.reviewed_by ?? null;
      record.specialist_review.reviewed_at = new Date().toISOString();
      record.workflow_status = body.payload?.status === "APPROVED" ? "HOSPITAL_MATCHING" : "REJECTED";
      appendAudit({ request_id: record.request_id, event_type: body.payload?.status === "APPROVED" ? "SPECIALIST_APPROVED" : "SPECIALIST_REJECTED", detail: body.payload?.notes ?? "", actor: body.payload?.reviewed_by ?? "specialist" });
      break;
    case "hospital_matching":
      record.hospital_matching.status = body.payload?.status ?? "COMPLETED";
      record.hospital_matching.recommendations = body.payload?.recommendations ?? [];
      appendAudit({ request_id: record.request_id, event_type: "HOSPITAL_MATCH_GENERATED", detail: `${record.hospital_matching.recommendations.length} recommendation(s)`, actor: "system" });
      break;
    case "referral":
      record.referral.status = body.payload?.status ?? record.referral.status;
      record.referral.referral_id = body.payload?.referral_id ?? record.referral.referral_id;
      record.referral.hospital_id = body.payload?.hospital_id ?? record.referral.hospital_id;
      record.workflow_status = "REFERRAL_CREATED";
      appendAudit({ request_id: record.request_id, event_type: "REFERRAL_CREATED", detail: record.referral.referral_id ?? "", actor: "system" });
      break;
    case "appointment":
      record.appointment.status = body.payload?.status ?? record.appointment.status;
      record.appointment.scheduled_at = body.payload?.scheduled_at ?? null;
      record.workflow_status = body.payload?.status === "SCHEDULED" ? "APPOINTMENT_PENDING" : record.workflow_status;
      appendAudit({ request_id: record.request_id, event_type: "APPOINTMENT_CREATED", detail: body.payload?.scheduled_at ?? "", actor: "system" });
      break;
    default:
      return NextResponse.json({ error: `Unknown stage: ${body.stage}` }, { status: 400 });
  }
  putRequest(record);
  return NextResponse.json({ ok: true, request: record });
}
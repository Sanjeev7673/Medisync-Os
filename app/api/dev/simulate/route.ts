import { NextRequest, NextResponse } from "next/server";
import { appendAudit, getRequest, putRequest } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { request_id } = await req.json();
  const record = await getRequest(request_id);
  if (!record) return NextResponse.json({ error: "Unknown request_id" }, { status: 404 });

  switch (record.workflow_status) {
    case "CREATED":
      record.request_type = "SPECIALIST_REVIEW";
      record.specialty = "Cardiology";
      record.specialist_review_required = true;
      record.document_required = false;
      record.classification_reason = "The patient is requesting assistance finding the appropriate specialist.";
      record.workflow_status = "PENDING_REVIEW";
      await appendAudit({ request_id, event_type: "REQUEST_CLASSIFIED", detail: "Classified as SPECIALIST_REVIEW (Cardiology)", actor: "system" });
      break;
    case "PENDING_REVIEW":
      record.specialist_review = { status: "APPROVED", reviewed_by: "DR-CARD-01", reviewed_at: new Date().toISOString(), notes: null };
      record.workflow_status = "HOSPITAL_MATCHING";
      await appendAudit({ request_id, event_type: "SPECIALIST_APPROVED", detail: "Approved by DR-CARD-01", actor: "DR-CARD-01" });
      break;
    case "HOSPITAL_MATCHING":
      record.hospital_matching = { status: "COMPLETED", recommendations: [{ hospital_id: "H001", hospital_name: "Hospital A", match_score: 0.94, matched_capabilities: ["Cardiology", "Cardiac Imaging", "ICU"], missing_capabilities: [], reason: "Hospital has the required specialty and capabilities." }] };
      record.workflow_status = "REFERRAL_CREATED";
      record.referral = { status: "CREATED", referral_id: "REF-2001", hospital_id: "H001" };
      await appendAudit({ request_id, event_type: "HOSPITAL_MATCH_GENERATED", detail: "1 recommendation (Hospital A, 94%)", actor: "system" });
      await appendAudit({ request_id, event_type: "REFERRAL_CREATED", detail: "REF-2001", actor: "system" });
      break;
    case "REFERRAL_CREATED":
      record.appointment = { status: "PENDING", scheduled_at: null };
      record.workflow_status = "APPOINTMENT_PENDING";
      await appendAudit({ request_id, event_type: "NOTIFICATION_SENT", detail: "Patient notified: appointment pending", actor: "system" });
      break;
    case "APPOINTMENT_PENDING":
      record.appointment = { status: "SCHEDULED", scheduled_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString() };
      record.workflow_status = "COMPLETED";
      await appendAudit({ request_id, event_type: "APPOINTMENT_CREATED", detail: record.appointment.scheduled_at ?? "", actor: "system" });
      break;
    default:
      break;
  }
  await putRequest(record);
  return NextResponse.json({ request: record });
}
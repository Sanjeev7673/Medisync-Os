import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRequest, listAuditForRequest } from "@/lib/store";
import { RequestStatusResponse } from "@/lib/types";

function canAccessRequest(
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>,
  record: Awaited<ReturnType<typeof getRequest>>,
) {
  if (!record) return false;
  if (session.role === "admin") return true;
  if (session.role === "patient") return session.patientId === record.patient_id;
  if (session.role === "specialist") return record.specialist_review_required === true;
  if (session.role === "hospital") {
    return session.hospitalId === record.referral.hospital_id;
  }
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;
  const record = await getRequest(id);
  if (!record) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!canAccessRequest(session, record)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response: RequestStatusResponse = {
    request_id: record.request_id,
    patient_id: record.patient_id,
    request: record.request,
    request_type: record.request_type,
    specialty: record.specialty,
    specialist_review_required: record.specialist_review_required,
    document_required: record.document_required,
    classification_reason: record.classification_reason,
    specialist_review: record.specialist_review,
    hospital_matching: record.hospital_matching,
    referral: record.referral,
    appointment: record.appointment,
    workflow_status: record.workflow_status,
  };

  return NextResponse.json({
    request: response,
    audit: await listAuditForRequest(id),
  });
}

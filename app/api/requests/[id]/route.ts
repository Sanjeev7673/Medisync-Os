import { NextRequest, NextResponse } from "next/server";
import { getRequest, listAuditForRequest } from "@/lib/store";
import { RequestStatusResponse } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getRequest(id);
  if (!record) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  const response: RequestStatusResponse = {
    request_id: record.request_id,
    patient_id: record.patient_id,
    request_type: record.request_type,
    specialty: record.specialty,
    specialist_review_required: record.specialist_review_required,
    document_required: record.document_required,
    specialist_review: record.specialist_review,
    hospital_matching: record.hospital_matching,
    referral: record.referral,
    appointment: record.appointment,
    workflow_status: record.workflow_status,
  };
  return NextResponse.json({ request: response, audit: listAuditForRequest(id) });
}
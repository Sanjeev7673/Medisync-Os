import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRequestForPatient } from "@/lib/repositories/requests";
import { listAuditForRequest } from "@/lib/repositories/audit";
import type { RequestStatusResponse } from "@/lib/types";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "NOT_FOUND") return 404;
  return 500;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "patient" || !session.patientId || session.sub !== session.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const record = await getRequestForPatient(session, id);
    if (!record) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const response: RequestStatusResponse = {
      request_id: record.request_id,
      patient_id: record.patient_id,
      request: record.request,
      request_type: record.request_type,
      specialty: record.specialty,
      specialist_review_required: record.specialist_review_required,
      document_required: record.document_required,
      classification_reason: record.classification_reason,
      ai_confidence: record.ai_confidence,
      specialist_review: record.specialist_review,
      hospital_matching: record.hospital_matching,
      referral: record.referral,
      appointment: record.appointment,
      workflow_status: record.workflow_status,
    };

    return NextResponse.json({
      request: response,
      audit: await listAuditForRequest(session, id),
    });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load request" }, { status: statusFor(error) });
  }
}

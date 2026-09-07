import { NextRequest, NextResponse } from "next/server";
import { appendAudit, createRequest, listRequestsForPatient } from "@/lib/store";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ error: "patient_id query parameter is required" }, { status: 400 });
  return NextResponse.json({ requests: await listRequestsForPatient(patientId) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.patient_id || !body?.request) return NextResponse.json({ error: "patient_id and request are required" }, { status: 400 });
  const record = await createRequest({
    patient_id: body.patient_id,
    request: body.request,
    request_source: body.request_source ?? "patient_portal",
    document_uploaded: Boolean(body.document_uploaded),
  });
  await appendAudit({ request_id: record.request_id, event_type: "REQUEST_CREATED", detail: `Request submitted via ${record.request_source}`, actor: record.patient_id });
  return NextResponse.json({ request: record }, { status: 201 });
}
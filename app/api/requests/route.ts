import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createRequest, listRequestsForPatient } from "@/lib/repositories/requests";

const WORKBENCH_WEBHOOK_URL = process.env.SNS_WORKBENCH_WEBHOOK_URL;
const WORKBENCH_WEBHOOK_SECRET = process.env.MEDISYNC_WEBHOOK_SECRET;

async function triggerWorkflow(record: Awaited<ReturnType<typeof createRequest>>) {
  if (!WORKBENCH_WEBHOOK_URL || !WORKBENCH_WEBHOOK_SECRET) return { triggered: false, reason: "Workflow webhook is not configured" };
  const response = await fetch(WORKBENCH_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MediSync-Webhook-Secret": WORKBENCH_WEBHOOK_SECRET },
    body: JSON.stringify({
      stage: "request_creation",
      request_id: record.request_id,
      payload: { patient_id: record.patient_id, request: record.request, request_source: record.request_source, document_uploaded: record.document_uploaded },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SNS Workbench webhook failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
  return { triggered: true };
}

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "INVALID_REQUEST") return 400;
  return 500;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const requestedPatientId = req.nextUrl.searchParams.get("patient_id");
  if (!requestedPatientId) return NextResponse.json({ error: "patient_id query parameter is required" }, { status: 400 });
  if (session.role !== "patient" || session.patientId !== requestedPatientId || session.sub !== requestedPatientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json({ requests: await listRequestsForPatient(session) });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load requests" }, { status: statusFor(error) });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "patient" || !session.patientId || session.sub !== session.patientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.patient_id || !body?.request) return NextResponse.json({ error: "patient_id and request are required" }, { status: 400 });
  if (body.patient_id !== session.patientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let record: Awaited<ReturnType<typeof createRequest>>;
  try {
    record = await createRequest(session, { request: body.request, document_uploaded: Boolean(body.document_uploaded) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "FORBIDDEN" ? "Forbidden" : "Unable to create request" }, { status: statusFor(error) });
  }

  try {
    const workflow = await triggerWorkflow(record);
    const { db_id: _dbId, ...publicRecord } = record;
    return NextResponse.json({ request: publicRecord, workflow }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Request created, but the workflow could not be triggered", request_id: record.request_id }, { status: 502 });
  }
}

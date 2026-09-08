import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { appendAudit, createRequest, listRequestsForPatient } from "@/lib/store";

const WORKBENCH_WEBHOOK_URL = process.env.SNS_WORKBENCH_WEBHOOK_URL;
const WORKBENCH_WEBHOOK_SECRET = process.env.MEDISYNC_WEBHOOK_SECRET;

async function triggerWorkflow(record: Awaited<ReturnType<typeof createRequest>>) {
  if (!WORKBENCH_WEBHOOK_URL || !WORKBENCH_WEBHOOK_SECRET) {
    return { triggered: false, reason: "Workflow webhook is not configured" };
  }

  const response = await fetch(WORKBENCH_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MediSync-Webhook-Secret": WORKBENCH_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      stage: "request_creation",
      request_id: record.request_id,
      payload: {
        patient_id: record.patient_id,
        request: record.request,
        request_source: record.request_source,
        document_uploaded: record.document_uploaded,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SNS Workbench webhook failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }

  return { triggered: true };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "patient" || !session.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedPatientId = req.nextUrl.searchParams.get("patient_id");
  if (!requestedPatientId) return NextResponse.json({ error: "patient_id query parameter is required" }, { status: 400 });
  if (session.patientId !== requestedPatientId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ requests: await listRequestsForPatient(session.patientId) });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "patient" || !session.patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body?.patient_id || !body?.request) {
    return NextResponse.json({ error: "patient_id and request are required" }, { status: 400 });
  }
  if (session.patientId !== body.patient_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const record = await createRequest({
    patient_id: session.patientId,
    request: body.request,
    request_source: "patient_portal",
    document_uploaded: Boolean(body.document_uploaded),
  });

  await appendAudit({
    request_id: record.request_id,
    event_type: "REQUEST_CREATED",
    detail: `Request submitted via ${record.request_source}`,
    actor: session.sub,
  });

  try {
    const workflow = await triggerWorkflow(record);
    await appendAudit({
      request_id: record.request_id,
      event_type: workflow.triggered ? "WORKFLOW_TRIGGERED" : "WORKFLOW_NOT_CONFIGURED",
      detail: workflow.triggered ? "Sent to SNS Workbench for processing" : (workflow.reason ?? "Workflow webhook is not configured"),
      actor: "system",
    });

    return NextResponse.json({ request: record, workflow }, { status: 201 });
  } catch (error) {
    await appendAudit({
      request_id: record.request_id,
      event_type: "WORKFLOW_TRIGGER_FAILED",
      detail: error instanceof Error ? error.message : "Unknown workflow trigger error",
      actor: "system",
    });

    return NextResponse.json(
      {
        error: "Request created, but the workflow could not be triggered",
        request_id: record.request_id,
      },
      { status: 502 },
    );
  }
}

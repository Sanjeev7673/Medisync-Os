import { NextRequest, NextResponse } from "next/server";
import { requireLiveSession } from "@/lib/auth";

export const runtime = "nodejs";

const WORKBENCH_WEBHOOK_URL = process.env.SNS_WORKBENCH_WEBHOOK_URL;
const WORKBENCH_WEBHOOK_SECRET = process.env.MEDISYNC_WEBHOOK_SECRET;

const ROLE_MAP = {
  patient: "PATIENT",
  hospital: "HOSPITAL",
  insurance_agent: "INSURANCE",
  admin: "ADMIN",
} as const;

type WorkbenchRole = (typeof ROLE_MAP)[keyof typeof ROLE_MAP];

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(req: NextRequest) {
  const auth = await requireLiveSession(req, [
    "patient",
    "hospital",
    "insurance_agent",
    "admin",
  ]);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status },
    );
  }

  if (!WORKBENCH_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "SNS Workbench webhook is not configured" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "A JSON request body is required" },
      { status: 400 },
    );
  }

  const role = ROLE_MAP[auth.session.role] as WorkbenchRole;
  const requestType = cleanString(
    (body as Record<string, unknown>).request_type ??
      (body as Record<string, unknown>).requestType,
    "GENERAL",
  ).toUpperCase();

  const requestId = cleanString(
    (body as Record<string, unknown>).request_id ??
      (body as Record<string, unknown>).requestId,
  );

  const documentId = cleanString(
    (body as Record<string, unknown>).document_id ??
      (body as Record<string, unknown>).documentId,
  );

  const payload = {
    request_id: requestId || crypto.randomUUID(),
    user_id: auth.session.sub,
    role,
    request_type: requestType,
    document_id: documentId || undefined,
    source: `medisync_${auth.session.role}_portal`,
    stage: "INITIAL",
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (WORKBENCH_WEBHOOK_SECRET) {
      headers["X-MediSync-Webhook-Secret"] = WORKBENCH_WEBHOOK_SECRET;
    }

    const response = await fetch(WORKBENCH_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get("content-type") || "";
    const responseBody = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      console.error("MediSync Workbench dispatch failed", {
        status: response.status,
        role,
        requestId: payload.request_id,
      });

      return NextResponse.json(
        {
          error: "SNS Workbench request failed",
          request_id: payload.request_id,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      accepted: true,
      request_id: payload.request_id,
      role,
      request_type: requestType,
      stage: "INITIAL",
      workbench: responseBody,
    });
  } catch (error) {
    console.error(
      "MediSync Workbench dispatch error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      {
        error: "Unable to reach SNS Workbench",
        request_id: payload.request_id,
      },
      { status: 502 },
    );
  }
}

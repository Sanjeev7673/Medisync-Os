import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ROLE_MAP = {
  patient: "PATIENT",
  hospital: "HOSPITAL",
  insurance_agent: "INSURANCE",
  insurance: "INSURANCE",
  admin: "ADMIN",
} as const;

type RoutedRole = keyof typeof ROLE_MAP;
type WorkbenchRole = (typeof ROLE_MAP)[RoutedRole];

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeRole(value: unknown): WorkbenchRole | null {
  const role = cleanString(value).toLowerCase() as RoutedRole;
  return ROLE_MAP[role] ?? null;
}

export async function POST(req: NextRequest) {
  const workbenchUrl = process.env.SNS_WORKBENCH_WEBHOOK_URL;
  const workbenchSecret = process.env.MEDISYNC_WEBHOOK_SECRET;

  if (!workbenchUrl) {
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

  const input = body as Record<string, unknown>;

  // Phase I testing mode: authentication is intentionally not required yet.
  // The role is supplied by the Vercel client and validated against the four
  // supported MediSync portal roles. Real session authentication can be added
  // later without changing the Workbench webhook contract.
  const role = normalizeRole(input.role);

  if (!role) {
    return NextResponse.json(
      {
        error: "Invalid role",
        allowed_roles: ["PATIENT", "HOSPITAL", "INSURANCE", "ADMIN"],
      },
      { status: 400 },
    );
  }

  const requestType = cleanString(
    input.request_type ?? input.requestType,
    "GENERAL",
  ).toUpperCase();

  const requestId = cleanString(
    input.request_id ?? input.requestId,
  );

  const documentId = cleanString(
    input.document_id ?? input.documentId,
  );

  const userId = cleanString(
    input.user_id ?? input.userId,
    "phase1-test-user",
  );

  const payload = {
    request_id: requestId || crypto.randomUUID(),
    user_id: userId,
    role,
    request_type: requestType,
    ...(documentId ? { document_id: documentId } : {}),
    source: `medisync_${role.toLowerCase()}_portal`,
    stage: "INITIAL",
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (workbenchSecret) {
      headers["X-MediSync-Webhook-Secret"] = workbenchSecret;
    }

    const response = await fetch(workbenchUrl, {
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
          role,
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
        role,
      },
      { status: 502 },
    );
  }
}

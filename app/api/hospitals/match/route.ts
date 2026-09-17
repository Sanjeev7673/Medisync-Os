import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type HospitalMatch = {
  hospitalName: string;
  city: string;
  tier: string;
  specialty: string;
  ownership: string;
  knownFor: string;
};

type MatchResponse = {
  matches: HospitalMatch[];
  count?: number;
  source?: string;
  demo?: boolean;
  disclaimer?: string;
};

function normalizeHospitalResponse(data: unknown): MatchResponse {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const responseData = root._responseData && typeof root._responseData === "object"
    ? (root._responseData as Record<string, unknown>)
    : {};

  const candidates = [
    responseData.hospitalResponse,
    responseData.output,
    responseData.response,
    data,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const value = candidate as Record<string, unknown>;
    if (Array.isArray(value.matches)) {
      return {
        matches: value.matches as HospitalMatch[],
        count: typeof value.count === "number" ? value.count : value.matches.length,
        source: typeof value.source === "string" ? value.source : "MediSync hospital dataset",
        demo: value.demo !== false,
        disclaimer:
          typeof value.disclaimer === "string"
            ? value.disclaimer
            : "Hospital information and tier classification are dataset-based and not live clinical or quality verification.",
      };
    }
  }

  return {
    matches: [],
    count: 0,
    source: "MediSync hospital dataset",
    demo: true,
    disclaimer:
      "Hospital information and tier classification are dataset-based and not live clinical or quality verification.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const webhookUrl = process.env.SNS_HOSPITAL_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: "SNS_HOSPITAL_WEBHOOK_URL is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: body.userId ?? "hospital-portal-user",
        role: "HOSPITAL",
        requestId: body.requestId ?? `hospital-${Date.now()}`,
        requestType: "HOSPITAL_MATCH",
        stage: "INITIAL",
        specialty: body.specialty ?? "",
        city: body.city ?? "",
        hospitalTier: body.hospitalTier ?? "",
      }),
      cache: "no-store",
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "SNS Workbench request failed", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: normalizeHospitalResponse(data),
    });
  } catch (error) {
    console.error("Hospital matching error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to connect to hospital matching service" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type HospitalMatch = {
  hospitalName: string;
  city: string;
  tier: string;
  specialty: string;
  ownership: string;
  knownFor: string;
  [key: string]: unknown;
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
  const responseData =
    root._responseData && typeof root._responseData === "object"
      ? (root._responseData as Record<string, unknown>)
      : {};

  // SNS Workbench may return either a formatted matches array or the
  // Data Processing object containing hospitalMatching.candidates.
  const objects: Record<string, unknown>[] = [
    root,
    responseData,
    ...Object.values(root).filter(
      (value): value is Record<string, unknown> =>
        !!value && typeof value === "object" && !Array.isArray(value)
    ),
    ...Object.values(responseData).filter(
      (value): value is Record<string, unknown> =>
        !!value && typeof value === "object" && !Array.isArray(value)
    ),
  ];

  let bestMatches: HospitalMatch[] = [];
  let bestMeta: Record<string, unknown> = {};

  for (const value of objects) {
    if (Array.isArray(value.matches)) {
      const matches = value.matches as HospitalMatch[];
      if (matches.length > bestMatches.length) {
        bestMatches = matches;
        bestMeta = value;
      }
    }

    const hospitalMatching =
      value.hospitalMatching && typeof value.hospitalMatching === "object"
        ? (value.hospitalMatching as Record<string, unknown>)
        : null;

    if (hospitalMatching && Array.isArray(hospitalMatching.candidates)) {
      const candidates = hospitalMatching.candidates as HospitalMatch[];
      if (candidates.length > bestMatches.length) {
        bestMatches = candidates;
        bestMeta = hospitalMatching;
      }
    }
  }

  return {
    matches: bestMatches,
    count: typeof bestMeta.count === "number" ? bestMeta.count : bestMatches.length,
    source:
      typeof bestMeta.source === "string"
        ? bestMeta.source
        : "MediSync hospital dataset",
    demo: bestMeta.demo !== false,
    disclaimer:
      typeof bestMeta.disclaimer === "string"
        ? bestMeta.disclaimer
        : "Hospital information and tier classification are dataset-based and not live clinical or quality verification.",
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
        requestId: body.requestId ?? "hospital-" + Date.now(),
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
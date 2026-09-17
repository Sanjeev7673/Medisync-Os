import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Hospital matching error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to connect to hospital matching service" },
      { status: 500 }
    );
  }
}

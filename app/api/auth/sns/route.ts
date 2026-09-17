import { NextRequest, NextResponse } from "next/server";

const SNS_WEBHOOK_URL = "https://api.agents.snsihub.ai/webhook/signin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body.action !== "string") {
      return NextResponse.json({ success: false, message: "Invalid authentication request." }, { status: 400 });
    }

    const response = await fetch(SNS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const raw = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      const nested = raw.match(/\{[\s\S]*\}/)?.[0];
      data = nested ? JSON.parse(nested) : { success: false, message: raw || "Invalid response from authentication service." };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("SNS authentication proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Authentication service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}

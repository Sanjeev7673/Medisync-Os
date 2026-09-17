import { NextRequest, NextResponse } from "next/server";

const SNS_WEBHOOK_URL = "https://api.agents.snsihub.ai/webhook/signin";

function normalizeResponse(raw: string) {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const nested = raw.match(/\{[\s\S]*\}/)?.[0];
    if (nested) {
      try {
        parsed = JSON.parse(nested);
      } catch {
        parsed = null;
      }
    }
  }

  // SNS/n8n-style webhook responses can arrive wrapped in an array or body field.
  if (Array.isArray(parsed)) parsed = parsed[0];
  if (parsed?.body && typeof parsed.body === "object") parsed = parsed.body;
  if (parsed?.data && typeof parsed.data === "object" && !parsed.success) parsed = parsed.data;

  return parsed ?? {
    success: false,
    message: raw || "Authentication service returned an empty response.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body.action !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid authentication request." },
        { status: 400 },
      );
    }

    const response = await fetch(SNS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const raw = await response.text();
    const data = normalizeResponse(raw);

    // Keep the SNS status but always return JSON in a predictable shape.
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("SNS authentication proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Authentication service is unavailable. Please try again.",
      },
      { status: 502 },
    );
  }
}

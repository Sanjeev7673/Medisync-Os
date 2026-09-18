import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const WEBHOOK_URL =
  process.env.SNS_MEDISYNC_CHAT_WEBHOOK_URL ||
  "https://api.agents.snsihub.ai/webhook/MediSyncChat";

function extractResponse(data: any): string | null {
  const candidates = [
    data?.response?.response,
    data?.output?.response,
    data?.response,
    data?.items?.[0]?.json?._responseData?.response?.response,
    data?.items?.[0]?.json?._responseData?.output?.response,
    data?.items?.[0]?.json?.response?.response,
    data?.items?.[0]?.json?.output?.response,
    data?.items?.[0]?.json?.response,
    data?.items?.[0]?.json?.text,
  ];

  for (const value of candidates) {
    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    if (!trimmed) continue;

    // Some Workbench responses expose the final answer as a JSON string.
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed?.response === "string") return parsed.response;
      if (typeof parsed?.output?.response === "string") return parsed.output.response;
    } catch {
      // Plain-text response; use it directly.
    }

    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return trimmed;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const upstream = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.error || "MediSync Assistant is temporarily unavailable." },
        { status: 502 }
      );
    }

    const response = extractResponse(data);

    if (!response) {
      return NextResponse.json(
        { error: "The assistant returned an unexpected response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ response });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to MediSync Assistant." },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const WEBHOOK_URL =
  process.env.SNS_MEDISYNC_CHAT_WEBHOOK_URL ||
  "https://api.agents.snsihub.ai/webhook/MediSyncChat";

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

    const response =
      data?.response?.response ??
      data?.output?.response ??
      data?.response ??
      null;

    if (typeof response !== "string") {
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

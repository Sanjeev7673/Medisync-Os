import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAbhaIdentity, linkAbha } from "@/lib/abha";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient") return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    return NextResponse.json({ identity: await getAbhaIdentity(session) });
  } catch (error) {
    console.error("ABHA identity lookup failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to load ABHA identity status" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient") return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await req.json().catch(() => null);
    const abha = typeof body?.abha === "string" ? body.abha.trim() : "";
    if (!abha) return NextResponse.json({ error: "Enter your ABHA number." }, { status: 400 });
    const identity = await linkAbha(session, abha);
    return NextResponse.json({ identity, message: identity.verification_status === "VERIFIED" ? "ABHA verified and linked." : identity.verification_status === "PENDING" ? "ABHA linkage submitted for verification." : "ABHA was securely recorded, but ABDM verification is not configured yet." }, { status: identity.verification_status === "VERIFIED" ? 200 : 202 });
  } catch (error) {
    if (error instanceof Error && error.message === "ABHA_ALREADY_LINKED") return NextResponse.json({ error: "This ABHA is already linked to another MediSync account." }, { status: 409 });
    if (error instanceof Error && error.message.includes("ABHA number")) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("ABHA identity link failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to link ABHA right now." }, { status: 503 });
  }
}

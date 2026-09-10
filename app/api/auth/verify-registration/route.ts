import { NextRequest, NextResponse } from "next/server";
import { createSession, dashboardForRole, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createRequest } from "@/lib/repositories/requests";
import { hashOtp, OTP_MAX_ATTEMPTS } from "@/lib/registration-otp";

const OTP_RE = /^\d{6}$/;

type RegistrationWorkflow = { triggered: boolean; reason?: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    const concern = typeof body?.concern === "string" ? body.concern.trim() : "";

    if (!email || !OTP_RE.test(otp)) return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
    if (!concern || concern.length < 10 || concern.length > 2000) return NextResponse.json({ error: "Please describe what you need help with (10–2000 characters)." }, { status: 400 });

    const db = getDb();
    const { data: pending, error: pendingError } = await db.from("pending_registrations").select("id,email,name,password_hash,otp_hash,otp_expires_at,attempts").eq("email", email).maybeSingle<{ id: string; email: string; name: string; password_hash: string; otp_hash: string; otp_expires_at: string; attempts: number }>();
    if (pendingError) throw pendingError;
    if (!pending) return NextResponse.json({ error: "This verification session has expired. Please start registration again.", code: "VERIFICATION_EXPIRED" }, { status: 410 });
    if (new Date(pending.otp_expires_at).getTime() <= Date.now()) {
      await db.from("pending_registrations").delete().eq("id", pending.id);
      return NextResponse.json({ error: "This verification code has expired. Please request a new code.", code: "OTP_EXPIRED" }, { status: 410 });
    }
    if (pending.attempts >= OTP_MAX_ATTEMPTS) return NextResponse.json({ error: "Too many incorrect attempts. Please start registration again.", code: "OTP_LOCKED" }, { status: 429 });
    if (hashOtp(otp) !== pending.otp_hash) {
      await db.from("pending_registrations").update({ attempts: pending.attempts + 1 }).eq("id", pending.id);
      return NextResponse.json({ error: "Incorrect verification code. Please try again.", code: "OTP_INVALID" }, { status: 400 });
    }

    const { data: existingUser, error: existingError } = await db.from("users").select("id").eq("email", email).maybeSingle<{ id: string }>();
    if (existingError) throw existingError;
    if (existingUser) {
      await db.from("pending_registrations").delete().eq("id", pending.id);
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead.", code: "ACCOUNT_EXISTS", redirectTo: "/login" }, { status: 409 });
    }

    const { data: user, error: userError } = await db.from("users").insert({ email: pending.email, password_hash: pending.password_hash, name: pending.name, role: "PATIENT", status: "ACTIVE" }).select("id,email,name,role,organization_id,status").single<{ id: string; email: string; name: string; role: "PATIENT"; organization_id: string | null; status: string }>();
    if (userError) {
      if (userError.code === "23505") return NextResponse.json({ error: "An account with this email already exists. Please sign in instead.", code: "ACCOUNT_EXISTS", redirectTo: "/login" }, { status: 409 });
      throw userError;
    }
    if (!user) throw new Error("Registration did not return the created user");

    await db.from("pending_registrations").delete().eq("id", pending.id);

    const session = await createSession({ sub: user.id, email: user.email, name: user.name, role: "patient", patientId: user.id });
    const requestSession = { sub: user.id, email: user.email, name: user.name, role: "patient" as const, patientId: user.id, sessionVersion: 1, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) };
    const request = await createRequest(requestSession, { request: concern, request_source: "patient_portal", document_uploaded: false });

    const webhookUrl = process.env.SNS_WORKBENCH_WEBHOOK_URL;
    const webhookSecret = process.env.MEDISYNC_WEBHOOK_SECRET;
    const workflow: RegistrationWorkflow = { triggered: false, reason: "Workflow webhook is not configured" };

    if (webhookUrl && webhookSecret) {
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-MediSync-Webhook-Secret": webhookSecret },
          body: JSON.stringify({ stage: "request_creation", request_id: request.request_id, payload: { patient_id: request.patient_id, request: request.request, request_source: request.request_source, document_uploaded: request.document_uploaded } }),
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (!webhookResponse.ok) {
          console.error(`MediSync SNS webhook failed (${webhookResponse.status}) for ${request.request_id}`);
          workflow.reason = `Workflow dispatch failed with HTTP ${webhookResponse.status}`;
        } else {
          workflow.triggered = true;
          delete workflow.reason;
        }
      } catch (error) {
        console.error("MediSync SNS webhook error:", error instanceof Error ? error.message : "Unknown webhook error");
        workflow.reason = "Workflow dispatch failed; registration was completed successfully";
      }
    }

    const response = NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email, name: user.name, role: "patient" }, request, workflow, redirectTo: dashboardForRole("patient") }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("MediSync registration verification failure:", error instanceof Error ? error.message : "Unknown verification error");
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Unable to create the patient request." }, { status: 403 });
    return NextResponse.json({ error: "Unable to complete registration. Please try again.", code: "REGISTRATION_COMPLETION_FAILED" }, { status: 503 });
  }
}

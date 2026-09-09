import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { assignHospitalAndCreateReferral } from "@/lib/repositories/referrals";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "NOT_FOUND") return 404;
  if (error.message === "INVALID_STAGE") return 409;
  if (error.message === "CONCURRENT_MODIFICATION") return 409;
  if (error.message === "HOSPITAL_NOT_ACTIVE") return 409;
  if (error.message === "HOSPITAL_CAPABILITY_NOT_FOUND") return 409;
  return 500;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!["admin", "hospital"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const requestId = typeof input.request_id === "string" ? input.request_id.trim() : "";
  const hospitalId = typeof input.hospital_id === "string" ? input.hospital_id.trim() : "";
  const specialistId = typeof input.specialist_id === "string" ? input.specialist_id.trim() : undefined;
  const clinicalSummary = typeof input.clinical_summary === "string" ? input.clinical_summary.trim() : undefined;
  const reason = typeof input.reason === "string" ? input.reason.trim() : undefined;

  if (!requestId || !hospitalId) {
    return NextResponse.json(
      { error: "request_id and hospital_id are required" },
      { status: 400 },
    );
  }

  try {
    const referral = await assignHospitalAndCreateReferral(session, {
      requestId,
      hospitalId,
      specialistId,
      clinicalSummary,
      reason,
    });

    return NextResponse.json({ request_id: requestId, referral }, { status: 201 });
  } catch (error) {
    const status = statusFor(error);
    const messages: Record<number, string> = {
      403: "Forbidden",
      404: "Request not found",
      409: "Request cannot be assigned and referred in its current state",
      500: "Unable to assign hospital and create referral",
    };
    return NextResponse.json({ error: messages[status] }, { status });
  }
}

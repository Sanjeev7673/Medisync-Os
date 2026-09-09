import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { advanceRequest } from "@/lib/repositories/requests";

type Decision = "APPROVE" | "REJECT";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "NOT_FOUND") return 404;
  if (error.message === "INVALID_TRANSITION") return 409;
  return 500;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (session.role !== "specialist") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const requestId = typeof body?.request_id === "string" ? body.request_id.trim() : "";
  const decision = typeof body?.decision === "string" ? body.decision.toUpperCase() : "";

  if (!requestId || !["APPROVE", "REJECT"].includes(decision)) {
    return NextResponse.json(
      { error: "request_id and decision (APPROVE or REJECT) are required" },
      { status: 400 },
    );
  }

  const nextStage = decision === "APPROVE" ? "HOSPITAL_MATCHING" : "REJECTED";

  try {
    const request = await advanceRequest(session, requestId, nextStage);
    return NextResponse.json({ request, decision });
  } catch (error) {
    const status = statusFor(error);
    const message = status === 404
      ? "Request not found"
      : status === 409
        ? "Request is not in a valid stage for this decision"
        : status === 403
          ? "Forbidden"
          : "Unable to process specialist review";

    return NextResponse.json({ error: message }, { status });
  }
}

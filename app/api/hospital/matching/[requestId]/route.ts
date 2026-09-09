import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findMatchingHospitals } from "@/lib/repositories/hospitals";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "NOT_FOUND") return 404;
  if (error.message === "INVALID_STAGE" || error.message === "NO_MATCHING_SPECIALTY") return 409;
  return 500;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!["admin", "hospital"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requestId } = await params;
  if (!requestId) {
    return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
  }

  try {
    const candidates = await findMatchingHospitals(session, requestId);
    return NextResponse.json({ request_id: requestId, candidates });
  } catch (error) {
    const status = statusFor(error);
    const message = status === 404
      ? "Request not found"
      : status === 403
        ? "Forbidden"
        : status === 409
          ? "Request is not ready for hospital matching"
          : "Unable to find matching hospitals";

    return NextResponse.json({ error: message }, { status });
  }
}

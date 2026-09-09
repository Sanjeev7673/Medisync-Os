import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { assignSpecialist } from "@/lib/repositories/requests";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "NOT_FOUND") return 404;
  if (error.message === "INVALID_SPECIALIST") return 400;
  return 500;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "hospital") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const requestId = typeof body?.request_id === "string" ? body.request_id.trim() : "";
  const specialistId = typeof body?.specialist_id === "string" ? body.specialist_id.trim() : "";

  if (!requestId || !specialistId) {
    return NextResponse.json(
      { error: "request_id and specialist_id are required" },
      { status: 400 },
    );
  }

  try {
    const request = await assignSpecialist(session, requestId, specialistId);
    return NextResponse.json({ request });
  } catch (error) {
    const status = statusFor(error);
    const message = status === 404
      ? "Request not found"
      : status === 403
        ? "Forbidden"
        : status === 400
          ? "Invalid specialist"
          : "Unable to assign specialist";

    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { listRequestsForSpecialist } from "@/lib/repositories/requests";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "SPECIALIST_NOT_VERIFIED") return 403;
  if (error.message === "SPECIALIST_QUEUE_INACTIVE") return 403;
  if (error.message === "SPECIALIST_PROFILE_NOT_FOUND") return 404;
  return 500;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (session.role !== "specialist") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const requests = await listRequestsForSpecialist(session);
    return NextResponse.json({ requests });
  } catch (error) {
    const status = statusFor(error);
    const message = status === 404
      ? "Specialist profile not found"
      : status === 403
        ? "Forbidden"
        : "Unable to load specialist review queue";

    return NextResponse.json({ error: message }, { status });
  }
}

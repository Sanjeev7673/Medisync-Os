import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRequestForSpecialist, resolveVerifiedSpecialist } from "@/lib/repositories/requests";
import { listAuditForSpecialist } from "@/lib/repositories/audit";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "NOT_FOUND" || error.message === "SPECIALIST_PROFILE_NOT_FOUND") return 404;
  if (error.message === "SPECIALIST_NOT_VERIFIED" || error.message === "SPECIALIST_QUEUE_INACTIVE") return 403;
  return 500;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (session.role !== "specialist") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Request ID is required" }, { status: 400 });

  try {
    const specialist = await resolveVerifiedSpecialist(session);
    const request = await getRequestForSpecialist(session, id);
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    return NextResponse.json({
      request,
      audit: await listAuditForSpecialist(session, id, specialist.id),
    });
  } catch (error) {
    const status = statusFor(error);
    const message = status === 404 ? "Request not found" : status === 403 ? "Forbidden" : "Unable to load specialist request";
    return NextResponse.json({ error: message }, { status });
  }
}

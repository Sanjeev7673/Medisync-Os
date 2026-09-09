import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRequestForSpecialist } from "@/lib/repositories/requests";
import { listAuditForSpecialist } from "@/lib/repositories/audit";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "FORBIDDEN") return 403;
  if (error.message === "NOT_FOUND") return 404;
  if (error.message === "SPECIALIST_PROFILE_NOT_FOUND") return 404;
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
    const request = await getRequestForSpecialist(session, id);
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const { data: specialist, error: specialistError } = await import("@/lib/db").then(({ getDb }) =>
      getDb().from("specialists").select("id").eq("user_id", session.sub).maybeSingle<{ id: string }>()
    );
    if (specialistError) throw specialistError;
    if (!specialist) return NextResponse.json({ error: "Specialist profile not found" }, { status: 404 });

    return NextResponse.json({ request, audit: await listAuditForSpecialist(session, id, specialist.id) });
  } catch (error) {
    const status = statusFor(error);
    const message = status === 404 ? "Request not found" : status === 403 ? "Forbidden" : "Unable to load specialist request";
    return NextResponse.json({ error: message }, { status });
  }
}

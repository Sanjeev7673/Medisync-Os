import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { bookAppointment, listAvailableAppointments } from "@/lib/repositories/appointments";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient") return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const appointments = await listAvailableAppointments(session, {
      hospitalId: req.nextUrl.searchParams.get("hospital_id") || undefined,
      specialistId: req.nextUrl.searchParams.get("specialist_id") || undefined,
      from: req.nextUrl.searchParams.get("from") || undefined,
      to: req.nextUrl.searchParams.get("to") || undefined,
    });
    return NextResponse.json({ appointments });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "FORBIDDEN" ? "Forbidden" : "Unable to load appointment slots" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient") return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.appointment_id) return NextResponse.json({ error: "appointment_id is required" }, { status: 400 });
  try {
    const appointment = await bookAppointment(session, String(body.appointment_id));
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to book appointment";
    const status = message === "SLOT_UNAVAILABLE" ? 409 : message === "FORBIDDEN" ? 403 : 503;
    return NextResponse.json({ error: status === 409 ? "That slot is no longer available." : "Unable to book appointment" }, { status });
  }
}

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

type Appointment = {
  id: string; referral_id: string; patient_id: string; hospital_id: string; specialist_id: string; starts_at: string; ends_at: string;
  status: "AVAILABLE" | "HELD" | "BOOKED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW"; booking_reference: string | null; metadata: Record<string, unknown>; created_at: string; updated_at: string;
};

const transitions: Record<Appointment["status"], Appointment["status"][]> = {
  AVAILABLE: ["HELD", "BOOKED", "CANCELLED"], HELD: ["BOOKED", "CANCELLED"], BOOKED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"], CANCELLED: [], COMPLETED: [], NO_SHOW: [],
};

async function assertPatientAppointment(session: Session, id: string) {
  if (session.role !== "patient" || session.sub !== session.patientId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("appointments").select("id").eq("id", id).eq("patient_id", session.patientId).maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) throw new Error("FORBIDDEN");
}

export async function listAvailableAppointments(session: Session, input: { hospitalId?: string; specialistId?: string; from?: string; to?: string }) {
  if (!["patient", "admin", "hospital", "specialist"].includes(session.role)) throw new Error("FORBIDDEN");
  let query = getDb().from("appointments").select("*").eq("status", "AVAILABLE").order("starts_at");
  if (input.hospitalId) query = query.eq("hospital_id", input.hospitalId);
  if (input.specialistId) query = query.eq("specialist_id", input.specialistId);
  if (input.from) query = query.gte("starts_at", input.from);
  if (input.to) query = query.lte("starts_at", input.to);
  const { data, error } = await query.returns<Appointment[]>();
  if (error) throw error;
  return data;
}

export async function createSlot(session: Session, input: { referralId: string; patientId: string; hospitalId: string; specialistId: string; startsAt: string; endsAt: string }) {
  if (!["hospital", "specialist", "admin"].includes(session.role)) throw new Error("FORBIDDEN");
  if (new Date(input.endsAt) <= new Date(input.startsAt)) throw new Error("INVALID_TIME_RANGE");
  const { data: conflict, error: conflictError } = await getDb().from("appointments").select("id").eq("specialist_id", input.specialistId).neq("status", "CANCELLED").lt("starts_at", input.endsAt).gt("ends_at", input.startsAt).limit(1);
  if (conflictError) throw conflictError;
  if (conflict?.length) throw new Error("SLOT_CONFLICT");
  const { data, error } = await getDb().from("appointments").insert({ referral_id: input.referralId, patient_id: input.patientId, hospital_id: input.hospitalId, specialist_id: input.specialistId, starts_at: input.startsAt, ends_at: input.endsAt, status: "AVAILABLE" }).select("*").single<Appointment>();
  if (error) throw error;
  return data;
}

export async function bookAppointment(session: Session, appointmentId: string) {
  if (session.role !== "patient" || !session.patientId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("appointments").update({ status: "BOOKED", booking_reference: `BK-${randomUUID().slice(0, 8).toUpperCase()}` }).eq("id", appointmentId).eq("patient_id", session.patientId).eq("status", "AVAILABLE").select("*").maybeSingle<Appointment>();
  if (error) throw error;
  if (!data) throw new Error("SLOT_UNAVAILABLE");
  return data;
}

export async function transitionAppointment(session: Session, appointmentId: string, nextStatus: Appointment["status"]) {
  if (!["admin", "hospital", "specialist"].includes(session.role)) throw new Error("FORBIDDEN");
  const { data: current, error: readError } = await getDb().from("appointments").select("*").eq("id", appointmentId).maybeSingle<Appointment>();
  if (readError) throw readError;
  if (!current) throw new Error("NOT_FOUND");
  if (!transitions[current.status].includes(nextStatus)) throw new Error("INVALID_TRANSITION");
  const { data, error } = await getDb().from("appointments").update({ status: nextStatus }).eq("id", appointmentId).eq("status", current.status).select("*").single<Appointment>();
  if (error) throw error;
  return data;
}

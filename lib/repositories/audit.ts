import { getDb } from "@/lib/db";
import type { Session, UserRole } from "@/lib/auth";

type AuditInput = {
  actorUserId: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  previousState?: unknown;
  newState?: unknown;
  metadata?: Record<string, unknown>;
};

type AuditRow = AuditInput & {
  id: string;
  created_at: string;
};

export async function appendAudit(input: AuditInput) {
  const { data, error } = await getDb()
    .from("audit_logs")
    .insert({
      actor_user_id: input.actorUserId,
      actor_role: input.actorRole,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      request_id: input.requestId ?? null,
      previous_state: input.previousState ?? null,
      new_state: input.newState ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single<AuditRow>();

  if (error) throw error;
  return data;
}

export async function listAuditForRequest(
  session: Session,
  requestId: string
) {
  let auditRequestId: string;

  if (session.role === "patient") {
    const { data: request, error: requestError } = await getDb()
      .from("requests")
      .select("id")
      .eq("request_id", requestId)
      .eq("patient_id", session.patientId ?? "")
      .maybeSingle<{ id: string }>();

    if (requestError) throw requestError;
    if (!request) throw new Error("FORBIDDEN");

    auditRequestId = request.id;
  } else if (session.role === "admin") {
    const { data: request, error: requestError } = await getDb()
      .from("requests")
      .select("id")
      .eq("request_id", requestId)
      .maybeSingle<{ id: string }>();

    if (requestError) throw requestError;
    if (!request) throw new Error("NOT_FOUND");

    auditRequestId = request.id;
  } else {
    throw new Error("FORBIDDEN");
  }

  const { data, error } = await getDb()
    .from("audit_logs")
    .select("*")
    .eq("request_id", auditRequestId)
    .order("created_at", { ascending: true })
    .returns<AuditRow[]>();

  if (error) throw error;
  return data;
}

export async function listAuditForSpecialist(
  session: Session,
  requestId: string,
  specialistId: string
) {
  if (session.role !== "specialist") {
    throw new Error("FORBIDDEN");
  }

  const { data: request, error: requestError } = await getDb()
    .from("requests")
    .select("id, assigned_specialist_id")
    .eq("request_id", requestId)
    .maybeSingle<{
      id: string;
      assigned_specialist_id: string | null;
    }>();

  if (requestError) throw requestError;
  if (!request) throw new Error("NOT_FOUND");

  if (request.assigned_specialist_id !== specialistId) {
    throw new Error("FORBIDDEN");
  }

  const { data, error } = await getDb()
    .from("audit_logs")
    .select("*")
    .eq("request_id", request.id)
    .order("created_at", { ascending: true })
    .returns<AuditRow[]>();

  if (error) throw error;
  return data;
}

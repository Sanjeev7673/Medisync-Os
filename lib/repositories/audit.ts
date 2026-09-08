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

type AuditRow = AuditInput & { id: string; created_at: string };

export async function appendAudit(input: AuditInput) {
  const { data, error } = await getDb().from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    actor_role: input.actorRole,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    request_id: input.requestId ?? null,
    previous_state: input.previousState ?? null,
    new_state: input.newState ?? null,
    metadata: input.metadata ?? {},
  }).select("*").single<AuditRow>();
  if (error) throw error;
  return data;
}

export async function listAuditForRequest(session: Session, requestId: string) {
  if (session.role === "patient") {
    const { data: request, error: requestError } = await getDb().from("requests").select("id").eq("request_id", requestId).eq("patient_id", session.patientId ?? "").maybeSingle<{ id: string }>();
    if (requestError) throw requestError;
    if (!request) throw new Error("FORBIDDEN");
  } else if (session.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  const { data, error } = await getDb().from("audit_logs").select("*").eq("request_id", requestId).order("created_at", { ascending: true }).returns<AuditRow[]>();
  if (error) throw error;
  return data;
}

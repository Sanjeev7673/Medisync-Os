import { getDb } from "@/lib/db";

export async function writeAudit(input: {
  actorUserId: string;
  action: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await getDb().from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

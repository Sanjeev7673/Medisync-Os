export async function listAuditForRequest(session: Session, requestId: string) {
  let auditRequestId = requestId;

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
  } else if (session.role !== "admin") {
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

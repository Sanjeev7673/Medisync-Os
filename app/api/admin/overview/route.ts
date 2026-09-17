import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

const ACTIVE_WORKFLOW_STAGES = [
  "CREATED",
  "CLASSIFIED",
  "SPECIALIST_REVIEW",
  "HOSPITAL_MATCHING",
  "REFERRAL",
  "APPOINTMENT_PENDING",
  "SCHEDULED",
] as const;

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const db = getDb();
    const [users, hospitals, insuranceUsers, specialists, activeWorkflows, pendingReviews, failedDocuments] = await Promise.all([
      db.from("users").select("id", { count: "exact", head: true }),
      db.from("hospitals").select("id", { count: "exact", head: true }),
      db.from("users").select("id,organization_id", { count: "exact" }).eq("role", "INSURANCE"),
      db.from("specialists").select("id", { count: "exact", head: true }),
      db.from("requests").select("id", { count: "exact", head: true }).in("workflow_stage", [...ACTIVE_WORKFLOW_STAGES]),
      db.from("specialists").select("id", { count: "exact", head: true }).eq("credential_status", "PENDING"),
      db.from("documents").select("id", { count: "exact", head: true }).eq("ocr_status", "FAILED"),
    ]);

    const errors = [users, hospitals, insuranceUsers, specialists, activeWorkflows, pendingReviews, failedDocuments].filter((result) => result.error);
    if (errors.length) throw errors[0].error;

    const organizationIds = new Set(
      (insuranceUsers.data ?? [])
        .map((row) => row.organization_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );

    return NextResponse.json({
      source: "live_database",
      metrics: {
        users: users.count ?? 0,
        hospitals: hospitals.count ?? 0,
        insuranceOrganizations: organizationIds.size,
        specialists: specialists.count ?? 0,
        activeWorkflows: activeWorkflows.count ?? 0,
        pendingReviews: pendingReviews.count ?? 0,
        failedWorkflows: failedDocuments.count ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load administrative metrics" }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient") return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const specialty = req.nextUrl.searchParams.get("specialty");
  let query = getDb().from("specialists").select("id,full_name,specialty,sub_specialty,credential_status,review_queue_status,profile").eq("credential_status", "VERIFIED").eq("review_queue_status", "AVAILABLE").order("full_name");
  if (specialty) query = query.ilike("specialty", specialty);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load specialists" }, { status: 503 });
  const specialists = (data ?? []).map((item) => ({ id: item.id, full_name: item.full_name, specialty: item.specialty, sub_specialty: item.sub_specialty, profile: item.profile ?? {} }));
  return NextResponse.json({ specialists });
}

import { NextRequest, NextResponse } from "next/server";
import { requireLiveSession } from "@/lib/auth";
import { getDocument } from "@/lib/repositories/documents";
import { createReportShareToken } from "@/lib/report-share";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireLiveSession(request, ["patient"]);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const document = await getDocument(auth.session, id);
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const token = createReportShareToken(id);
    const origin = new URL(request.url).origin;
    return NextResponse.json({ url: `${origin}/report/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create report share link";
    const status = message === "REPORT_SHARE_SECRET_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? "Report sharing is not configured yet." : "Unable to create report share link." }, { status });
  }
}

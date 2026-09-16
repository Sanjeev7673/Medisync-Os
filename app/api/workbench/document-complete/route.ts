import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createReportShareToken } from "@/lib/report-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function webhookSecret() {
  return process.env.MEDISYNC_WEBHOOK_SECRET || "";
}

function secretStatus(request: NextRequest) {
  const provided = request.headers.get("x-medisync-webhook-secret") || "";
  const expected = webhookSecret();
  return {
    header_received: Boolean(provided),
    secret_configured: Boolean(expected),
    secret_matches:
      Boolean(provided) && Boolean(expected) && provided === expected,
  };
}

export async function POST(request: NextRequest) {
  const status = secretStatus(request);

  if (request.headers.get("x-medisync-debug") === "true") {
    return NextResponse.json(status);
  }

  if (!status.secret_configured) {
    return NextResponse.json(
      { error: "MEDISYNC_WEBHOOK_SECRET is not configured" },
      { status: 503 },
    );
  }

  if (!status.secret_matches) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const documentId = String(body?.document_id || body?.documentId || "").trim();

    if (!documentId) {
      return NextResponse.json(
        { error: "document_id is required" },
        { status: 400 },
      );
    }

    const rawAnalysis = body?.analysis ?? body?.gemini_analysis ?? body?.result ?? body?.content;
    let candidate = rawAnalysis;
    if (typeof candidate === "string") {
      try { candidate = JSON.parse(candidate); } catch { candidate = {}; }
    }
    if (candidate && typeof candidate === "object" && "content" in candidate) {
      const content = (candidate as any).content;
      const parts = content?.parts;
      if (Array.isArray(parts) && typeof parts[0]?.text === "string") {
        try { candidate = JSON.parse(parts[0].text); } catch { candidate = {}; }
      }
    }
    const raw = candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? candidate as Record<string, unknown> : {};
    const rawFindings = Array.isArray(raw.findings) ? raw.findings : [];
    const findings = rawFindings.map((finding) => {
      const f = finding && typeof finding === "object" ? finding as Record<string, unknown> : {};
      const result = f.result ?? f.value ?? null;
      const unit = typeof f.unit === "string" ? f.unit : "";
      return {
        item: String(f.item ?? f.test ?? "Documented finding"),
        value: [result, unit].filter((x) => x !== null && x !== "").join(" ") || null,
        reference_range: f.reference_range == null ? null : String(f.reference_range),
        status: String(f.status ?? "not_reported"),
        evidence: f.evidence == null ? "Source evidence" : String(f.evidence),
      };
    });
    const analysis = {
      document_type: raw.document_type == null ? undefined : String(raw.document_type),
      report_date: raw.report_date == null ? null : String(raw.report_date),
      summary: raw.summary == null ? undefined : String(raw.summary),
      findings,
      key_observations: Array.isArray(raw.key_observations) ? raw.key_observations.filter((x): x is string => typeof x === "string") : [],
      supportive_findings: Array.isArray(raw.supportive_findings) ? raw.supportive_findings.filter((x): x is string => typeof x === "string") : [],
      limitations_and_concerns: Array.isArray(raw.limitations_and_concerns) ? raw.limitations_and_concerns.filter((x): x is string => typeof x === "string") : [],
      possible_associations: Array.isArray(raw.possible_associations) ? raw.possible_associations.filter((x): x is string => typeof x === "string") : [],
      symptom_associations: Array.isArray(raw.symptom_associations) ? raw.symptom_associations.filter((x): x is string => typeof x === "string") : [],
      red_flags: Array.isArray(raw.red_flags) ? raw.red_flags.filter((x): x is string => typeof x === "string") : [],
      questions_for_clinician: Array.isArray(raw.questions_for_clinician) ? raw.questions_for_clinician.filter((x): x is string => typeof x === "string") : [],
      priority: raw.priority == null ? "not_stated" : String(raw.priority),
      specialty_hint: raw.specialty_hint == null ? null : String(raw.specialty_hint),
      workflow: raw.workflow == null ? "DOCUMENT" : String(raw.workflow),
      confidence: typeof raw.confidence === "number" ? raw.confidence : undefined,
      requires_human_review: raw.requires_human_review === true || raw.human_review_required === true,
    };

    const ocrText = String(body?.ocr_text ?? body?.ocrText ?? "");
    const db = getDb();
    const { data: document, error: documentError } = await db
      .from("documents")
      .select("id,metadata")
      .eq("id", documentId)
      .maybeSingle<{ id: string; metadata: Record<string, unknown> }>();
    if (documentError) throw documentError;
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const now = new Date().toISOString();
    const metadata = {
      ...(document.metadata ?? {}),
      ai_analysis: analysis,
      ai_analyzed_at: now,
      ai_model: "SNS Workbench + Gemini",
      workbench_completed_at: now,
    };
    const { error: updateError } = await db
      .from("documents")
      .update({
        ocr_status: "COMPLETED",
        ocr_text: ocrText || null,
        validation_status: analysis.requires_human_review ? "REQUIRES_REVIEW" : "VALID",
        processing_status: "COMPLETED",
        processing_error: null,
        processed_at: now,
        metadata,
      })
      .eq("id", documentId);
    if (updateError) throw updateError;

    const token = createReportShareToken(documentId);
    const origin = new URL(request.url).origin;
    const reportUrl = `${origin}/report/${encodeURIComponent(documentId)}?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ ok: true, document_id: documentId, report_url: reportUrl, report_id: `MSR-${documentId.slice(0, 8).toUpperCase()}`, processing_status: "COMPLETED" });
  } catch (error) {
    console.error("MediSync Workbench completion callback failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to persist Workbench document analysis" }, { status: 500 });
  }
}

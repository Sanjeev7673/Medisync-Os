import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { createDocumentMetadata, listDocuments, updateDocumentIntelligence } from "@/lib/repositories/documents";
import { analyzeDocument } from "@/lib/document-intelligence";

export const runtime = "nodejs";

const BUCKET = "patient-reports";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

async function ensureBucket() {
  const db = getDb();
  const { data: existing } = await db.storage.getBucket(BUCKET);
  if (existing) return;
  const { error } = await db.storage.createBucket(BUCKET, { public: false, fileSizeLimit: `${MAX_FILE_BYTES}` });
  if (error && !/already exists/i.test(error.message)) throw error;
}

function extension(filename: string, contentType: string) {
  const fromName = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : undefined;
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  return contentType === "application/pdf" ? "pdf" : contentType.split("/")[1] || "bin";
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient" || !session.patientId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const documents = await listDocuments(session, session.patientId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("MediSync document list failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to load documents" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient" || !session.patientId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Please select a PDF or image report." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Supported report formats are PDF, PNG, JPEG, and WEBP." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Report must be between 1 byte and 15 MB." }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    await ensureBucket();

    const path = `${session.patientId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension(file.name, file.type)}`;
    const db = getDb();
    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    let document;
    try {
      document = await createDocumentMetadata(session, {
        patientId: session.patientId,
        bucket: BUCKET,
        path,
        originalFilename: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
        checksumSha256: checksum,
        metadata: { source: "patient_portal", processing: "ai_document_intelligence" },
      });
    } catch (error) {
      await db.storage.from(BUCKET).remove([path]).catch(() => undefined);
      throw error;
    }

    const analysis = await analyzeDocument({ bytes, contentType: file.type, filename: file.name });
    const persisted = await updateDocumentIntelligence(session, document.id, {
      analysis: analysis as unknown as Record<string, unknown>,
      ocrText: JSON.stringify({ summary: analysis.summary, findings: analysis.findings, key_observations: analysis.key_observations }),
      validationStatus: "VALID",
    });

    let workflowTriggered = false;
    let workflowWarning: string | undefined;
    const webhookUrl = process.env.SNS_WORKBENCH_WEBHOOK_URL;
    const webhookSecret = process.env.MEDISYNC_WEBHOOK_SECRET;
    if (webhookUrl && webhookSecret) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-MediSync-Webhook-Secret": webhookSecret },
          body: JSON.stringify({
            stage: "document_analysis",
            document_id: document.id,
            patient_id: session.patientId,
            payload: {
              document_id: document.id,
              patient_id: session.patientId,
              filename: file.name,
              document_type: analysis.document_type,
              summary: analysis.summary,
              priority: analysis.priority,
              specialty_hint: analysis.specialty_hint,
              workflow: analysis.workflow,
              confidence: analysis.confidence,
              requires_human_review: true,
            },
          }),
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`SNS webhook returned ${response.status}`);
        workflowTriggered = true;
      } catch (error) {
        workflowWarning = "The report was analyzed and saved, but workflow routing is temporarily unavailable.";
        console.error("MediSync document SNS dispatch failure:", error instanceof Error ? error.message : "Unknown error");
      }
    }

    return NextResponse.json({ document: persisted, analysis, workflow: { triggered: workflowTriggered, warning: workflowWarning } }, { status: 201 });
  } catch (error) {
    console.error("MediSync document analysis failure:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to analyze this report. Please try again." }, { status: 503 });
  }
}

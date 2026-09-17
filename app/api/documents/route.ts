import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import {
  createDocumentMetadata,
  listDocuments,
  markDocumentFailed,
  markDocumentProcessing,
  updateDocumentIntelligence,
} from "@/lib/repositories/documents";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "patient-reports";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

async function ensureBucket() {
  const db = getDb();
  const { data: existing } = await db.storage.getBucket(BUCKET);
  if (existing) return;
  const { error } = await db.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_FILE_BYTES}`,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

function extension(filename: string, contentType: string) {
  const value = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : undefined;
  if (value && /^[a-z0-9]{1,5}$/.test(value)) return value;
  return contentType === "application/pdf" ? "pdf" : contentType.split("/")[1] || "bin";
}

async function analyzeDirect(req: NextRequest, file: File) {
  const form = new FormData();
  form.append("file", file, file.name);

  const cookie = req.headers.get("cookie");
  const response = await fetch(new URL("/api/documents/analyze", req.url), {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(55000),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Document analysis failed (${response.status})`);
  }
  return data as {
    success: true;
    sourceType: "pdf" | "image";
    filename: string;
    mimeType: string;
    extractedText: string | null;
    analysis: Record<string, unknown>;
    humanReviewRequired: boolean;
  };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient" || !session.patientId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  try {
    return NextResponse.json({ documents: await listDocuments(session, session.patientId) });
  } catch (error) {
    console.error("MediSync document list failure:", error);
    return NextResponse.json({ error: "Unable to load documents" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "patient" || !session.patientId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let documentId: string | undefined;
  let uploadedPath: string | undefined;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const requestIdValue = form.get("request_id");
    const requestId = typeof requestIdValue === "string" && requestIdValue.trim()
      ? requestIdValue.trim()
      : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please select a PDF or image report." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Supported report formats are PDF, PNG, JPEG, and WEBP." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Report must be between 1 byte and 15 MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    await ensureBucket();

    const path = `${session.patientId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension(file.name, file.type)}`;
    uploadedPath = path;
    const db = getDb();

    const { error: uploadError } = await db.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    try {
      const document = await createDocumentMetadata(session, {
        patientId: session.patientId,
        requestId,
        bucket: BUCKET,
        path,
        originalFilename: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
        checksumSha256: checksum,
        metadata: {
          source: "patient_portal",
          processing: "direct_vercel_mistral_gemini",
          workflow: "document_analysis",
        },
      });
      documentId = document.id;
      await markDocumentProcessing(session, document.id);

      const analysis = await analyzeDirect(req, file);
      const saved = await updateDocumentIntelligence(session, document.id, {
        analysis: {
          ...analysis.analysis,
          source_type: analysis.sourceType,
          filename: analysis.filename,
          mime_type: analysis.mimeType,
          human_review_required: analysis.humanReviewRequired,
        },
        ocrText: analysis.extractedText || "",
        validationStatus: "REQUIRES_REVIEW",
      });

      return NextResponse.json({
        document: saved,
        analysis: analysis.analysis,
        ocrText: analysis.extractedText,
        workflow: {
          status: "completed",
          message: "Document extracted with Mistral OCR and Gemini and saved for human review.",
        },
      }, { status: 201 });
    } catch (error) {
      if (documentId) {
        await markDocumentFailed(session, documentId, error instanceof Error ? error.message : "Document processing failed").catch(() => undefined);
      } else if (uploadedPath) {
        await db.storage.from(BUCKET).remove([uploadedPath]).catch(() => undefined);
      }
      throw error;
    }
  } catch (error) {
    console.error("MediSync direct document processing failure:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to complete document processing. Please try again.",
    }, { status: 503 });
  }
}

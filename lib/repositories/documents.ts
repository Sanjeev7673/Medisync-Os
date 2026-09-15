import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

type DocumentRow = {
  id: string; patient_id: string; request_id: string | null; referral_id: string | null; storage_provider: string; storage_bucket: string; storage_path: string;
  original_filename: string; content_type: string | null; file_size_bytes: number | null; checksum_sha256: string | null;
  ocr_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"; validation_status: "PENDING" | "VALID" | "INVALID" | "REQUIRES_REVIEW";
  ocr_text: string | null; validation_log: unknown[]; metadata: Record<string, unknown>; processing_status?: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED"; processing_error?: string | null; processed_at?: string | null; created_at: string; updated_at: string;
};

function assertPatient(session: Session, patientId: string) { if (session.role !== "patient" || session.sub !== patientId || session.patientId !== patientId) throw new Error("FORBIDDEN"); }

export async function createDocumentMetadata(session: Session, input: { patientId: string; requestId?: string; referralId?: string; bucket: string; path: string; originalFilename: string; contentType?: string; fileSizeBytes?: number; checksumSha256?: string; metadata?: Record<string, unknown> }) {
  assertPatient(session, input.patientId);
  const { data, error } = await getDb().from("documents").insert({ patient_id: input.patientId, request_id: input.requestId ?? null, referral_id: input.referralId ?? null, storage_bucket: input.bucket, storage_path: input.path, original_filename: input.originalFilename, content_type: input.contentType ?? null, file_size_bytes: input.fileSizeBytes ?? null, checksum_sha256: input.checksumSha256 ?? null, metadata: input.metadata ?? {}, processing_status: "UPLOADED" }).select("*").single<DocumentRow>();
  if (error) throw error;
  return data;
}

export async function listDocuments(session: Session, patientId: string) {
  assertPatient(session, patientId);
  const { data, error } = await getDb().from("documents").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).returns<DocumentRow[]>();
  if (error) throw error;
  return data;
}

export async function getDocument(session: Session, documentId: string) {
  if (session.role !== "patient" || !session.patientId) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("documents").select("*").eq("id", documentId).eq("patient_id", session.patientId).maybeSingle<DocumentRow>();
  if (error) throw error;
  return data;
}

export async function markDocumentProcessing(session: Session, documentId: string) {
  const document = await getDocument(session, documentId);
  if (!document) throw new Error("NOT_FOUND");
  const { error } = await getDb().from("documents").update({ processing_status: "PROCESSING", processing_error: null }).eq("id", documentId).eq("patient_id", session.patientId);
  if (error) throw error;
}

export async function markDocumentFailed(session: Session, documentId: string, message: string) {
  const document = await getDocument(session, documentId);
  if (!document) throw new Error("NOT_FOUND");
  await getDb().from("documents").update({ ocr_status: "FAILED", processing_status: "FAILED", processing_error: message.slice(0, 1000) }).eq("id", documentId).eq("patient_id", session.patientId);
}

export async function updateDocumentIntelligence(session: Session, documentId: string, input: { analysis: Record<string, unknown>; ocrText: string; validationStatus?: DocumentRow["validation_status"] }) {
  const document = await getDocument(session, documentId);
  if (!document) throw new Error("NOT_FOUND");
  const { data, error } = await getDb().from("documents").update({
    ocr_status: "COMPLETED",
    ocr_text: input.ocrText,
    validation_status: input.validationStatus ?? "VALID",
    processing_status: "COMPLETED",
    processing_error: null,
    processed_at: new Date().toISOString(),
    metadata: { ...(document.metadata ?? {}), ai_analysis: input.analysis, ai_analyzed_at: new Date().toISOString(), ai_model: process.env.OPENAI_DOCUMENT_MODEL || "gpt-5.6-luna" },
  }).eq("id", documentId).eq("patient_id", session.patientId).select("*").single<DocumentRow>();
  if (error) throw error;
  return data;
}

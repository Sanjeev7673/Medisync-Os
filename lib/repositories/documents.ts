import { getDb } from "@/lib/db";
import type { Session } from "@/lib/auth";

type DocumentRow = {
  id: string; patient_id: string; request_id: string | null; referral_id: string | null; storage_provider: string; storage_bucket: string; storage_path: string;
  original_filename: string; content_type: string | null; file_size_bytes: number | null; checksum_sha256: string | null;
  ocr_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"; validation_status: "PENDING" | "VALID" | "INVALID" | "REQUIRES_REVIEW";
  ocr_text: string | null; validation_log: unknown[]; metadata: Record<string, unknown>; created_at: string; updated_at: string;
};

function assertPatient(session: Session, patientId: string) { if (session.role !== "patient" || session.sub !== patientId || session.patientId !== patientId) throw new Error("FORBIDDEN"); }

export async function createDocumentMetadata(session: Session, input: { patientId: string; requestId?: string; referralId?: string; bucket: string; path: string; originalFilename: string; contentType?: string; fileSizeBytes?: number; checksumSha256?: string; metadata?: Record<string, unknown> }) {
  assertPatient(session, input.patientId);
  const { data, error } = await getDb().from("documents").insert({ patient_id: input.patientId, request_id: input.requestId ?? null, referral_id: input.referralId ?? null, storage_bucket: input.bucket, storage_path: input.path, original_filename: input.originalFilename, content_type: input.contentType ?? null, file_size_bytes: input.fileSizeBytes ?? null, checksum_sha256: input.checksumSha256 ?? null, metadata: input.metadata ?? {} }).select("*").single<DocumentRow>();
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

export async function updateOcrStatus(session: Session, documentId: string, status: DocumentRow["ocr_status"], ocrText?: string) {
  if (!["admin", "specialist", "hospital"].includes(session.role)) throw new Error("FORBIDDEN");
  const patch: Record<string, unknown> = { ocr_status: status };
  if (ocrText !== undefined) patch.ocr_text = ocrText;
  const { data, error } = await getDb().from("documents").update(patch).eq("id", documentId).select("*").single<DocumentRow>();
  if (error) throw error;
  return data;
}

export async function updateValidation(session: Session, documentId: string, status: DocumentRow["validation_status"], log?: unknown[]) {
  if (!["admin", "specialist", "hospital"].includes(session.role)) throw new Error("FORBIDDEN");
  const { data, error } = await getDb().from("documents").update({ validation_status: status, validation_log: log ?? [] }).eq("id", documentId).select("*").single<DocumentRow>();
  if (error) throw error;
  return data;
}

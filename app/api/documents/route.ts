import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import {
  createDocumentMetadata,
  listDocuments,
  markDocumentFailed,
  markDocumentProcessing,
} from "@/lib/repositories/documents";

export const runtime = "nodejs";

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

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

function extension(filename: string, contentType: string) {
  const fromName = filename.includes(".")
    ? filename.split(".").pop()?.toLowerCase()
    : undefined;

  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) {
    return fromName;
  }

  return contentType === "application/pdf"
    ? "pdf"
    : contentType.split("/")[1] || "bin";
}

/**
 * Sends the original uploaded document to the SINGLE common
 * SNS Agent Workbench webhook.
 *
 * The webhook is the INITIAL/common entry point for every role.
 * Patient document processing is identified by request_type.
 *
 * Workbench receives:
 * - file              -> original PDF/image binary
 * - user_id           -> authenticated user UUID
 * - role              -> trusted server-side role (PATIENT here)
 * - request_type      -> DOCUMENT
 * - request_id        -> MediSync request UUID
 * - document_id       -> MediSync document UUID
 * - patient_id        -> authenticated patient UUID (branch context)
 * - filename          -> original filename
 * - content_type      -> original MIME type
 * - source            -> originating portal
 * - stage             -> INITIAL
 */
async function triggerWorkflow({
  bytes,
  contentType,
  filename,
  documentId,
  patientId,
  userId,
  requestId,
}: {
  bytes: Buffer;
  contentType: string;
  filename: string;
  documentId: string;
  patientId: string;
  userId: string;
  requestId: string;
}) {
  const webhookUrl = process.env.SNS_WORKBENCH_WEBHOOK_URL;
  const webhookSecret = process.env.MEDISYNC_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return {
      triggered: false,
      warning: "SNS Workbench webhook is not configured.",
    };
  }

  try {
    const form = new FormData();

    /*
     * Workbench Mistral OCR is configured to read:
     * Input Type: Binary Data
     * Input Binary Field: file
     *
     * Therefore the original uploaded document must be sent
     * as multipart/form-data under the field name "file".
     */
    const blob = new Blob([new Uint8Array(bytes)], {
      type: contentType,
    });

    form.append("file", blob, filename);

    /*
     * Common INITIAL request context.
     * Role is derived from the authenticated server session,
     * never from a browser-supplied role field.
     */
    form.append("user_id", userId);
    form.append("role", "PATIENT");
    form.append("request_type", "DOCUMENT");
    form.append("request_id", requestId);
    form.append("document_id", documentId);

    /*
     * Patient-specific context is retained for the Patient branch.
     */
    form.append("patient_id", patientId);

    form.append("filename", filename);
    form.append("content_type", contentType);
    form.append("source", "medisync_patient_portal");
    form.append("stage", "INITIAL");

    const headers: Record<string, string> = {};

    /*
     * Secret is optional at the code level so the webhook can still
     * operate if you haven't configured the secret yet.
     *
     * If MEDISYNC_WEBHOOK_SECRET exists, it will be sent.
     */
    if (webhookSecret) {
      headers["X-MediSync-Webhook-Secret"] = webhookSecret;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");

      throw new Error(
        `SNS Workbench returned ${response.status}${
          responseText ? `: ${responseText.slice(0, 300)}` : ""
        }`,
      );
    }

    let responseData: unknown = null;

    /*
     * Workbench may return JSON or an empty response depending
     * on the webhook configuration.
     */
    const responseType = response.headers.get("content-type") || "";

    if (responseType.includes("application/json")) {
      responseData = await response.json().catch(() => null);
    } else {
      responseData = await response.text().catch(() => null);
    }

    return {
      triggered: true,
      response: responseData,
    };
  } catch (error) {
    console.error(
      "MediSync SNS Workbench dispatch failure:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return {
      triggered: false,
      warning:
        "The document was uploaded, but SNS Workbench processing could not be started.",
    };
  }
}

export async function GET(req: NextRequest) {
  /*
   * DO NOT TOUCH AUTHENTICATION.
   */
  const session = await getSessionFromRequest(req);

  if (
    !session ||
    session.role !== "patient" ||
    !session.patientId
  ) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json({
      documents: await listDocuments(session, session.patientId),
    });
  } catch (error) {
    console.error(
      "MediSync document list failure:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      { error: "Unable to load documents" },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  /*
   * DO NOT TOUCH AUTHENTICATION.
   */
  const session = await getSessionFromRequest(req);

  if (
    !session ||
    session.role !== "patient" ||
    !session.patientId
  ) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  let documentId: string | undefined;
  let uploadedPath: string | undefined;

  try {
    /*
     * Receive the original multipart/form-data upload
     * from the MediSync frontend.
     */
    const form = await req.formData();

    const file = form.get("file");

    /*
     * Every upload gets a request UUID if the caller did not provide one.
     * The same requestId is persisted with the document and sent to
     * the common INITIAL Workbench webhook.
     */
    const requestIdValue = form.get("request_id");
    const requestId =
      typeof requestIdValue === "string" && requestIdValue.trim()
        ? requestIdValue.trim()
        : randomUUID();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Please select a PDF or image report.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Supported report formats are PDF, PNG, JPEG, and WEBP.",
        },
        { status: 400 },
      );
    }

    if (
      file.size <= 0 ||
      file.size > MAX_FILE_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "Report must be between 1 byte and 15 MB.",
        },
        { status: 400 },
      );
    }

    /*
     * Convert uploaded file to Buffer once.
     * The same bytes are:
     * 1. Stored in Supabase Storage
     * 2. Sent to SNS Workbench
     */
    const bytes = Buffer.from(await file.arrayBuffer());

    const checksum = createHash("sha256")
      .update(bytes)
      .digest("hex");

    /*
     * Ensure the private Supabase bucket exists.
     */
    await ensureBucket();

    /*
     * Generate a unique storage path.
     */
    const path = `${session.patientId}/${new Date()
      .toISOString()
      .slice(0, 10)}/${randomUUID()}.${extension(
      file.name,
      file.type,
    )}`;

    uploadedPath = path;

    const db = getDb();

    /*
     * Store the original medical document securely.
     */
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    try {
      /*
       * Create the MediSync document record.
       */
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

          /*
           * Processing is handled by SNS Agent Workbench.
           */
          processing: "sns_workbench_document_intelligence",

          workflow: "document_analysis",
        },
      });

      documentId = document.id;

      /*
       * Mark the document as processing BEFORE
       * sending it to Workbench.
       */
      await markDocumentProcessing(
        session,
        document.id,
      );

      /*
       * SEND ORIGINAL DOCUMENT TO THE SINGLE COMMON
       * SNS WORKBENCH WEBHOOK.
       *
       * Common stage:
       *   INITIAL
       *
       * Patient request context:
       *   role=PATIENT
       *   request_type=DOCUMENT
       *
       * The Workbench Patient -> DOCUMENT branch can
       * transition into document_analysis internally.
       */
      const workflow = await triggerWorkflow({
        bytes,
        contentType: file.type,
        filename: file.name,

        documentId: document.id,
        patientId: session.patientId,
        userId: session.sub,
        requestId,
      });

      /*
       * If Workbench could not be triggered, mark the
       * MediSync document as failed.
       */
      if (!workflow.triggered) {
        await markDocumentFailed(
          session,
          document.id,
          workflow.warning ||
            "SNS Workbench processing could not be started.",
        );

        return NextResponse.json(
          {
            error:
              workflow.warning ||
              "Unable to start document processing.",
            document: {
              ...document,
              processing_status: "failed",
            },
            workflow,
          },
          { status: 503 },
        );
      }

      /*
       * IMPORTANT:
       *
       * We DO NOT call updateDocumentIntelligence() here because
       * SNS Workbench has not necessarily finished OCR + AI analysis.
       * The document remains in processing state until the final
       * Workbench callback/result persistence is implemented.
       */
      return NextResponse.json(
        {
          document,
          analysis: null,

          workflow: {
            triggered: true,
            status: "processing",
            message:
              "Document uploaded successfully and sent to SNS Agent Workbench for OCR and AI analysis.",
            response: workflow.response ?? null,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      /*
       * If a document record exists, mark it failed.
       */
      if (documentId) {
        await markDocumentFailed(
          session,
          documentId,
          error instanceof Error
            ? error.message
            : "Document processing failed",
        ).catch(() => undefined);
      } else if (uploadedPath) {
        /*
         * If metadata creation failed, remove the
         * orphaned Supabase Storage file.
         */
        await db.storage
          .from(BUCKET)
          .remove([uploadedPath])
          .catch(() => undefined);
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "MediSync document processing failure:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete document processing. Please try again.",
      },
      { status: 503 },
    );
  }
}

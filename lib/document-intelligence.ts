import OpenAI from "openai";

export type DocumentAnalysis = {
  document_type: string;
  report_date: string | null;
  summary: string;
  findings: Array<{
    item: string;
    value: string | null;
    reference_range: string | null;
    status: "normal" | "abnormal" | "unclear" | "not_reported";
    evidence: string;
  }>;
  key_observations: string[];
  supportive_findings: string[];
  limitations_and_concerns: string[];
  possible_associations: string[];
  symptom_associations: string[];
  red_flags: string[];
  questions_for_clinician: string[];
  priority: "routine" | "review_soon" | "urgent_review" | "unclear";
  specialty_hint: string | null;
  workflow: "DOCUMENT" | "SPECIALIST_REVIEW" | "APPOINTMENT" | "GENERAL";
  confidence: number;
  requires_human_review: true;
  limitations: string[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document_type: { type: "string" },
    report_date: { type: ["string", "null"] },
    summary: { type: "string" },
    findings: { type: "array", items: { type: "object", additionalProperties: false, properties: { item: { type: "string" }, value: { type: ["string", "null"] }, reference_range: { type: ["string", "null"] }, status: { type: "string", enum: ["normal", "abnormal", "unclear", "not_reported"] }, evidence: { type: "string" } }, required: ["item", "value", "reference_range", "status", "evidence"] } },
    key_observations: { type: "array", items: { type: "string" } },
    supportive_findings: { type: "array", items: { type: "string" } },
    limitations_and_concerns: { type: "array", items: { type: "string" } },
    possible_associations: { type: "array", items: { type: "string" } },
    symptom_associations: { type: "array", items: { type: "string" } },
    red_flags: { type: "array", items: { type: "string" } },
    questions_for_clinician: { type: "array", items: { type: "string" } },
    priority: { type: "string", enum: ["routine", "review_soon", "urgent_review", "unclear"] },
    specialty_hint: { type: ["string", "null"] },
    workflow: { type: "string", enum: ["DOCUMENT", "SPECIALIST_REVIEW", "APPOINTMENT", "GENERAL"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    requires_human_review: { type: "boolean", enum: [true] },
    limitations: { type: "array", items: { type: "string" } },
  },
  required: ["document_type", "report_date", "summary", "findings", "key_observations", "supportive_findings", "limitations_and_concerns", "possible_associations", "symptom_associations", "red_flags", "questions_for_clinician", "priority", "specialty_hint", "workflow", "confidence", "requires_human_review", "limitations"],
} as const;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function analyzeDocument(input: { bytes: Buffer; contentType: string; filename: string }): Promise<DocumentAnalysis> {
  const client = new OpenAI({ apiKey: required("OPENAI_API_KEY") });
  const model = process.env.OPENAI_DOCUMENT_MODEL || "gpt-5.6-luna";
  const response = await client.responses.create({
    model,
    store: false,
    input: [
      { role: "developer", content: [{ type: "input_text", text: [
        "You are MediSync Document Intelligence, a healthcare document understanding assistant.",
        "Analyze only evidence explicitly present in the supplied document. Preserve uncertainty and never invent facts.",
        "Extract report facts, measurements, reference ranges, dates, observations and source wording accurately.",
        "supportive_findings may describe useful or reassuring findings that are explicitly documented.",
        "limitations_and_concerns should describe missing context, unclear text, limitations of the document, or documented concerns.",
        "possible_associations may explain medically plausible associations between documented findings and symptoms, but must use uncertainty language such as may, can, or could and must never state a diagnosis.",
        "symptom_associations may connect reported symptoms to documented findings only when the relationship is reasonably supported; never claim causation.",
        "red_flags must only include urgent/critical findings explicitly present in the document or safety-relevant symptoms explicitly supplied in the document. Do not invent emergency findings.",
        "questions_for_clinician should be neutral questions a patient could ask an authorized clinician about the documented evidence.",
        "Never diagnose, prescribe, recommend a treatment, change medication, or make an autonomous clinical decision.",
        "specialty_hint is only a routing hint based on document content.",
        "urgent_review is allowed only when the source contains an explicit critical/urgent flag or clearly critical result; otherwise use review_soon, routine, or unclear.",
        "Always require human specialist/clinician review before clinical interpretation or action.",
        "Return only the requested structured object.",
      ].join(" ") }] },
      { role: "user", content: [
        { type: "input_text", text: `Analyze this healthcare document for MediSync record standardization and care coordination. Filename: ${input.filename}` },
        { type: "input_file", filename: input.filename, file_data: `data:${input.contentType};base64,${input.bytes.toString("base64")}` },
      ] },
    ],
    text: { format: { type: "json_schema", name: "medisync_document_analysis", strict: true, schema } },
  });
  if (!response.output_text) throw new Error("Document AI returned no analysis");
  return JSON.parse(response.output_text) as DocumentAnalysis;
}
